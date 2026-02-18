import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

function base64UrlToUint8Array(base64Url) {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
    return arr
}

function getSubscriptionKeys(subscription) {
    const json = subscription.toJSON()
    return {
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh || null,
        auth: json.keys?.auth || null,
    }
}

function normalizeVapidKey(rawKey) {
    return String(rawKey || '')
        .trim()
        .replace(/^"|"$/g, '')
}

function mapPushError(err) {
    const name = err?.name || ''
    const message = err?.message || ''

    if (name === 'NotAllowedError') return 'Permiso denegado para notificaciones push.'
    if (name === 'InvalidStateError') return 'Suscripcion push invalida. Intenta nuevamente.'
    if (name === 'AbortError') return 'La suscripcion push fue interrumpida. Reintenta.'
    if (name === 'NotSupportedError') return 'Este dispositivo o navegador no soporta Push.'
    if (/gcm_sender_id|applicationServerKey|VAPID/i.test(message)) {
        return 'La clave VAPID publica parece invalida en el frontend.'
    }
    return message || 'No se pudo configurar notificaciones push.'
}

function withTimeout(promise, ms, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms)
        }),
    ])
}

export function usePushNotifications({ user, role = 'user' }) {
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    )
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const isSupported = useMemo(() => {
        return typeof window !== 'undefined'
            && 'serviceWorker' in navigator
            && 'PushManager' in window
            && 'Notification' in window
    }, [])

    const syncSubscriptionState = useCallback(async () => {
        if (!isSupported || !user) {
            setIsSubscribed(false)
            return
        }
        const registration = await withTimeout(
            navigator.serviceWorker.ready,
            10000,
            'No se pudo obtener el Service Worker.'
        )
        const sub = await withTimeout(
            registration.pushManager.getSubscription(),
            10000,
            'No se pudo leer la suscripcion Push.'
        )
        setIsSubscribed(Boolean(sub))
    }, [isSupported, user])

    const saveSubscription = useCallback(async (subscription) => {
        if (!user) throw new Error('Necesitas iniciar sesion para activar notificaciones push.')

        const { endpoint, p256dh, auth } = getSubscriptionKeys(subscription)
        const payload = {
            user_id: user.id,
            role,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent || null,
            enabled: true,
            last_seen_at: new Date().toISOString(),
        }

        const { error: upsertError } = await supabase
            .from('push_subscriptions')
            .upsert(payload, { onConflict: 'user_id,endpoint' })

        if (upsertError) throw upsertError
    }, [role, user])

    const subscribe = useCallback(async () => {
        if (!isSupported) throw new Error('Este dispositivo no soporta Push Notifications.')
        if (!user) throw new Error('Necesitas iniciar sesion para activar notificaciones push.')

        const vapidPublicKey = normalizeVapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY)
        if (!vapidPublicKey) throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY en el frontend.')
        if (vapidPublicKey.length < 40) throw new Error('VITE_VAPID_PUBLIC_KEY no tiene un formato valido.')

        setLoading(true)
        setError(null)
        try {
            const registration = await withTimeout(
                navigator.serviceWorker.ready,
                10000,
                'No se pudo obtener el Service Worker.'
            )
            let nextPermission = Notification.permission

            if (nextPermission !== 'granted') {
                nextPermission = await withTimeout(
                    Notification.requestPermission(),
                    15000,
                    'El permiso de notificaciones no respondio a tiempo.'
                )
                setPermission(nextPermission)
            }
            if (nextPermission !== 'granted') {
                throw new Error('Permiso de notificaciones denegado.')
            }

            let subscription = await withTimeout(
                registration.pushManager.getSubscription(),
                10000,
                'No se pudo leer la suscripcion Push.'
            )
            if (!subscription) {
                const subscribeAttempt = async () => registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
                })

                try {
                    subscription = await withTimeout(
                        subscribeAttempt(),
                        15000,
                        'No se pudo crear la suscripcion Push.'
                    )
                } catch (firstErr) {
                    const stale = await registration.pushManager.getSubscription()
                    if (stale) {
                        try { await stale.unsubscribe() } catch (_) { }
                    }
                    subscription = await withTimeout(
                        subscribeAttempt(),
                        15000,
                        mapPushError(firstErr)
                    )
                }
            }

            await withTimeout(
                saveSubscription(subscription),
                10000,
                'No se pudo guardar la suscripcion en la base de datos.'
            )
            await syncSubscriptionState()
            return { ok: true }
        } catch (err) {
            setError(mapPushError(err))
            return { ok: false, error: err }
        } finally {
            setLoading(false)
        }
    }, [isSupported, saveSubscription, syncSubscriptionState, user])

    const unsubscribe = useCallback(async () => {
        if (!isSupported || !user) return
        setLoading(true)
        setError(null)
        try {
            const registration = await withTimeout(
                navigator.serviceWorker.ready,
                10000,
                'No se pudo obtener el Service Worker.'
            )
            const subscription = await withTimeout(
                registration.pushManager.getSubscription(),
                10000,
                'No se pudo leer la suscripcion Push.'
            )

            if (subscription) {
                const endpoint = subscription.endpoint
                await withTimeout(
                    subscription.unsubscribe(),
                    10000,
                    'No se pudo desactivar la suscripcion Push local.'
                )
                await withTimeout(
                    supabase
                        .from('push_subscriptions')
                        .update({ enabled: false, last_seen_at: new Date().toISOString() })
                        .eq('user_id', user.id)
                        .eq('endpoint', endpoint),
                    10000,
                    'No se pudo actualizar la suscripcion en la base de datos.'
                )
            }

            await syncSubscriptionState()
            setIsSubscribed(false)
        } catch (err) {
            setError(err.message || 'No se pudo desactivar notificaciones push.')
            return { ok: false, error: err }
        } finally {
            setLoading(false)
        }
    }, [isSupported, syncSubscriptionState, user])

    useEffect(() => {
        if (!isSupported) return
        setPermission(Notification.permission)
    }, [isSupported])

    useEffect(() => {
        syncSubscriptionState().catch(() => setIsSubscribed(false))
    }, [syncSubscriptionState])

    return {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        subscribe,
        unsubscribe,
        syncSubscriptionState,
    }
}
