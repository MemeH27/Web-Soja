import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type OrderRow = {
  id: string
  user_id: string | null
  client_name?: string | null
  total?: number | null
  status?: string | null
  delivery_id?: string | null
}

type DbWebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: OrderRow
  old_record?: OrderRow | null
  new?: OrderRow
  old?: OrderRow | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const PUSH_WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') || ''

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-webhook-secret',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getEventData(payload: DbWebhookPayload) {
  const eventType = String(payload.type || '').toUpperCase()
  const record = payload.record || payload.new || null
  const oldRecord = payload.old_record || payload.old || null
  return { eventType, record, oldRecord }
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case 'pending': return 'confirmado'
    case 'cooking': return 'cocinándose'
    case 'ready': return 'listo para entrega'
    case 'shipped': return 'en camino'
    case 'delivered': return 'entregado'
    case 'cancelled': return 'cancelado'
    default: return 'actualizado'
  }
}

async function buildNotifications(
  eventType: string,
  record: OrderRow | null,
  oldRecord: OrderRow | null
) {
  const jobs: Array<{
    target: 'admins' | 'user' | 'delivery'
    userIds: string[]
    title: string
    body: string
    url: string
    tag: string
  }> = []

  if (!record) return jobs

  const orderCode = record.id?.slice(0, 8).toUpperCase()

  if (eventType === 'INSERT') {
    jobs.push({
      target: 'admins',
      userIds: [],
      title: 'Nuevo pedido',
      body: `${record.client_name || 'Cliente'} realizó un pedido (#${orderCode}).`,
      url: '/adminpanel',
      tag: `order-insert-${record.id}`,
    })
  }

  if (eventType === 'UPDATE') {
    // Si se asigna un repartidor
    if (record.delivery_id && oldRecord?.delivery_id !== record.delivery_id) {
      jobs.push({
        target: 'delivery',
        userIds: [record.delivery_id],
        title: 'Pedido asignado',
        body: `Se te asignó el pedido #${orderCode}.`,
        url: '/deliverypanel',
        tag: `delivery-assigned-${record.id}`,
      })
    }

    // Si cambia el estado
    if (record.user_id && oldRecord?.status !== record.status) {
      let body = `Tu pedido #${orderCode} está ${statusLabel(record.status)}.`

      if (record.status === 'delivered') {
        body = `¡Tu pedido #${orderCode} ha sido entregado! Gracias por confiar en nosotros. ¡Buen provecho y gracias por comprar con SOJA! 🥢🍣`
      } else if (record.status === 'ready') {
        body = `¡Buenas noticias! Tu pedido #${orderCode} ya está listo y empaquetado. ✨`
      } else if (record.status === 'cooking') {
        body = `¡Manos a la obra! Tu pedido #${orderCode} ya se entró a cocina. 👨‍🍳🔥`
      } else if (record.status === 'shipped') {
        let deliveryName = 'El repartidor'
        if (record.delivery_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', record.delivery_id)
            .single()
          if (profile?.first_name) {
            deliveryName = profile.first_name
          }
        }
        body = `¡${deliveryName} va en camino con tu pedido #${orderCode}! Prepárate para recibirlo. 🛵`
      }

      jobs.push({
        target: 'user',
        userIds: [record.user_id],
        title: 'Actualización de tu pedido',
        body,
        url: '/tracking',
        tag: `order-status-${record.id}-${record.status}`,
      })
    }

    // Si se cancela el pedido
    if (record.status === 'cancelled' && oldRecord?.status !== 'cancelled') {
      // Notificar a admins
      jobs.push({
        target: 'admins',
        userIds: [],
        title: 'Pedido Cancelado ❌',
        body: `El pedido #${orderCode} ha sido cancelado por el cliente.`,
        url: '/adminpanel',
        tag: `order-cancelled-admin-${record.id}`,
      })

      // Notificar a repartidor si existe
      if (record.delivery_id) {
        jobs.push({
          target: 'delivery',
          userIds: [record.delivery_id],
          title: 'Pedido Cancelado ❌',
          body: `El pedido #${orderCode} que tenías asignado ha sido cancelado.`,
          url: '/deliverypanel',
          tag: `order-cancelled-delivery-${record.id}`,
        })
      }
    }
  }

  return jobs
}

async function getAdminIds() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (error) throw error
  return (data || []).map((row: { id: string }) => row.id)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-webhook-secret' } })
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

  let payload: DbWebhookPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400)
  }

  const { eventType, record, oldRecord } = getEventData(payload)
  if (!record || !record.id) {
    return jsonResponse({ ok: true, skipped: 'No order record in payload' })
  }

  const jobs = await buildNotifications(eventType, record, oldRecord)
  if (jobs.length === 0) {
    return jsonResponse({ ok: true, skipped: 'No push jobs for this event' })
  }

  try {
    const allTargets: string[] = []
    for (const job of jobs) {
      if (job.target === 'admins') {
        const adminIds = await getAdminIds()
        allTargets.push(...adminIds)
      } else {
        allTargets.push(...job.userIds)
      }
    }

    const uniqueUserIds = [...new Set(allTargets.filter(Boolean))]
    if (uniqueUserIds.length === 0) {
      return jsonResponse({ ok: true, skipped: 'No users to notify' })
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth,enabled')
      .in('user_id', uniqueUserIds)
      .eq('enabled', true)

    if (subscriptionsError) throw subscriptionsError

    const invalidIds: string[] = []
    let sent = 0

    for (const job of jobs) {
      const userIdsForJob = job.target === 'admins'
        ? await getAdminIds()
        : job.userIds

      const subs = (subscriptions || []).filter((s: any) => userIdsForJob.includes(s.user_id))

      for (const sub of subs) {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        const message = {
          title: job.title,
          body: job.body,
          url: job.url,
          tag: job.tag,
        }

        try {
          await webpush.sendNotification(pushSub as any, JSON.stringify(message), { TTL: 60 })
          sent += 1
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status || 0
          const body = err?.body || ''
          console.error(`Push send error ${statusCode}: ${err?.message || err}. Body: ${body}`)

          if (statusCode === 404 || statusCode === 410) {
            invalidIds.push(sub.id)
          }
        }
      }
    }

    if (invalidIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .in('id', invalidIds)
    }

    return jsonResponse({ ok: true, sent, disabled_invalid: invalidIds.length })
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
