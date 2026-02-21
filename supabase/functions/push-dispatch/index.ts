import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-webhook-secret',
}

// Environment variables
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:example@example.com'
const PUSH_WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') || ''

// Supabase details
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Only set VAPID details if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    console.log('✅ VAPID details configured successfully')
  } catch (e) {
    console.error('❌ VAPID setup error:', e)
  }
} else {
  console.warn('⚠️ VAPID keys missing in secrets')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate Webhook Secret
    const incomingSecret = req.headers.get('x-push-webhook-secret')
    if (!PUSH_WEBHOOK_SECRET || incomingSecret !== PUSH_WEBHOOK_SECRET) {
      console.error('Forbidden: Invalid Webhook Secret')
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    console.log('--- push-dispatch Received Payload ---')
    console.log(`Type: ${payload.type} | Table: ${payload.table}`)

    if (payload.table !== 'orders') {
      return new Response(JSON.stringify({ ok: true, message: 'Ignored non-orders table' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const order = payload.record
    const oldOrder = payload.old_record
    const status = order.status
    const oldStatus = oldOrder?.status

    // Build independent notification jobs to avoid overwriting between flows
    // Each job has its own title, body, tag and list of target user IDs
    const jobs: Array<{ title: string; body: string; tag: string; userIds: string[] }> = []
    const baseTag = `order-${order.id}`

    // Flow 1: New order -> Admin
    if (payload.type === 'INSERT' && status === 'pending') {
      jobs.push({
        title: '🔔 Nuevo Pedido!',
        body: `Nuevo pedido de ${order.client_name || 'Cliente'} por L ${order.total}`,
        tag: `${baseTag}-admin`,
        userIds: [], // admins fetched below
      })
    }

    // Flow 2: Status change -> Client
    if (payload.type === 'UPDATE' && status !== oldStatus) {
      let clientTitle = ''
      let clientBody = ''

      if (status === 'cooking') {
        clientTitle = '👨‍🍳 Tu pedido se está cocinando'
        clientBody = 'Estamos preparando tu SOJA con mucho amor.'
      } else if (status === 'ready' || status === 'prepared') {
        clientTitle = '✅ Pedido Listo!'
        clientBody = 'Tu pedido está listo para ser recogido o enviado.'
      } else if (status === 'shipped') {
        clientTitle = '🛵 Pedido en camino!'
        clientBody = 'Tu pedido SOJA ya va hacia tu ubicación.'
      } else if (status === 'delivered') {
        clientTitle = '🥡 Pedido Entregado'
        clientBody = '¡Gracias por tu compra! Que disfrutes tu SOJA.'
      } else if (status === 'cancelled') {
        clientTitle = '❌ Pedido Cancelado'
        clientBody = 'Tu pedido ha sido cancelado.'
      }

      if (clientBody && order.user_id) {
        jobs.push({
          title: clientTitle,
          body: clientBody,
          tag: `${baseTag}-client`,
          userIds: [order.user_id],
        })
      }
    }

    // Flow 3: Assignment -> Delivery person
    // Separate job so it doesn't overwrite the client notification
    if (payload.type === 'UPDATE' && order.delivery_id && order.delivery_id !== oldOrder?.delivery_id) {
      jobs.push({
        title: '🛵 Nuevo Pedido Asignado',
        body: `Tienes un nuevo pedido para entregar a ${order.client_name || 'Cliente'}`,
        tag: `${baseTag}-delivery`,
        userIds: [order.delivery_id],
      })
    }

    // Flow 4: Order cancelled by client -> Delivery person (if already assigned)
    if (
      payload.type === 'UPDATE' &&
      status === 'cancelled' &&
      status !== oldStatus &&
      order.delivery_id
    ) {
      jobs.push({
        title: '❌ Pedido Cancelado',
        body: `El cliente canceló el pedido de ${order.client_name || 'Cliente'}`,
        tag: `${baseTag}-delivery-cancel`,
        userIds: [order.delivery_id],
      })
    }

    if (jobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No notification needed for this update' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Initialize Supabase Admin for DB lookups
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // If it's a new order, fetch all admins and add them to the admin job
    if (payload.type === 'INSERT' && status === 'pending') {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      const adminJob = jobs.find(j => j.tag.endsWith('-admin'))
      if (adminJob && admins) {
        admins.forEach((a: { id: string }) => adminJob.userIds.push(a.id))
      }
    }

    // Remove jobs with no target users
    const activeJobs = jobs.filter(j => j.userIds.length > 0)
    if (activeJobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No target users found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Collect all unique user IDs across all jobs
    const allUserIds = [...new Set(activeJobs.flatMap(j => j.userIds))]

    // Fetch subscriptions for all target users in one query
    const { data: allSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', allUserIds)
      .eq('enabled', true)

    if (!allSubscriptions || allSubscriptions.length === 0) {
      console.log(`No active subscriptions found for users: ${allUserIds.join(', ')}`)
      return new Response(JSON.stringify({ ok: true, message: 'No subscriptions found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`Processing ${activeJobs.length} notification job(s) for ${allUserIds.length} users...`)

    let totalSent = 0

    // Process each job independently
    for (const job of activeJobs) {
      const jobSubscriptions = allSubscriptions.filter((sub: { user_id: string }) => job.userIds.includes(sub.user_id))
      if (jobSubscriptions.length === 0) continue

      const results = await Promise.allSettled(
        jobSubscriptions.map(async (sub: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }) => {
          const pushConfig = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          }

          const notificationPayload = JSON.stringify({
            title: job.title,
            body: job.body,
            icon: '/img/logo/logo_rojo.png',
            badge: '/img/logo/logo_rojo.png',
            data: {
              orderId: order.id,
              url: `/order/${order.id}`,
            },
            tag: job.tag,
            renotify: true
          })

          try {
            await webpush.sendNotification(pushConfig, notificationPayload)
            totalSent++
            return { success: true, userId: sub.user_id }
          } catch (err: any) {
            // If subscription is expired/invalid, disable it in DB
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('push_subscriptions').update({ enabled: false }).eq('id', sub.id)
              console.log(`Disabled invalid subscription for user ${sub.user_id}`)
            }
            throw err
          }
        })
      )

      console.log(`Job [${job.tag}] results:`, JSON.stringify(results.map(r => r.status)))
    }

    return new Response(JSON.stringify({ ok: true, sentCount: totalSent, jobCount: activeJobs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Push Dispatch Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
