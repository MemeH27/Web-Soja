import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-webhook-secret',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase env vars' }, 500)
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return jsonResponse({ error: 'Missing VAPID env vars' }, 500)
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return jsonResponse({ error: 'Missing bearer token' }, 401)
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData?.user) {
    console.error('Auth error in self-test:', authError)
    return jsonResponse({ error: 'Unauthorized user token' }, 401)
  }

  let payload: { title?: string; body?: string; url?: string; tag?: string } = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const title = String(payload.title || 'SOJA')
  const body = String(payload.body || 'Push activadas correctamente.')
  const url = String(payload.url || '/')
  const tag = String(payload.tag || `self-test-${authData.user.id}`)

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', authData.user.id)
    .eq('enabled', true)

  if (subscriptionsError) {
    return jsonResponse({ error: subscriptionsError.message }, 500)
  }

  if (!subscriptions || subscriptions.length === 0) {
    return jsonResponse({ ok: true, sent: 0, skipped: 'No enabled subscriptions for user' })
  }

  const invalidIds: string[] = []
  let sent = 0

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }

    const message = { title, body, url, tag }

    try {
      await webpush.sendNotification(pushSub as any, JSON.stringify(message), { TTL: 60 })
      sent += 1
    } catch (err: any) {
      const statusCode = err?.statusCode || err?.status || 0
      if (statusCode === 404 || statusCode === 410) {
        invalidIds.push(sub.id)
      } else {
        console.error('Push self-test error', statusCode, err?.message || err)
      }
    }
  }

  if (invalidIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in('id', invalidIds)
  }

  return jsonResponse({
    ok: true,
    sent,
    disabled_invalid: invalidIds.length,
  })
})
