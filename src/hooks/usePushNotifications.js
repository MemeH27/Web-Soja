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
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
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
            .upsert(payload, { onConflict: 'endpoint' })

        if (upsertError) throw upsertError
    }, [role, user])

    const subscribe = useCallback(async () => {
        if (!isSupported) throw new Error('Este dispositivo no soporta Push Notifications.')
        if (!user) throw new Error('Necesitas iniciar sesion para activar notificaciones push.')

        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY en el frontend.')

        setLoading(true)
        setError(null)
        try {
            const registration = await navigator.serviceWorker.ready
            let nextPermission = Notification.permission

            if (nextPermission !== 'granted') {
                nextPermission = await Notification.requestPermission()
                setPermission(nextPermission)
            }
            if (nextPermission !== 'granted') {
                throw new Error('Permiso de notificaciones denegado.')
            }

            let subscription = await registration.pushManager.getSubscription()
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
                })
            }

            await saveSubscription(subscription)
            setIsSubscribed(true)
            return { ok: true }
        } catch (err) {
            setError(err.message || 'No se pudo activar notificaciones push.')
            throw err
        } finally {
            setLoading(false)
        }
    }, [isSupported, saveSubscription, user])

    const unsubscribe = useCallback(async () => {
        if (!isSupported || !user) return
        setLoading(true)
        setError(null)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                const endpoint = subscription.endpoint
                await subscription.unsubscribe()
                await supabase
                    .from('push_subscriptions')
                    .update({ enabled: false, last_seen_at: new Date().toISOString() })
                    .eq('endpoint', endpoint)
            }

            setIsSubscribed(false)
        } catch (err) {
            setError(err.message || 'No se pudo desactivar notificaciones push.')
            throw err
        } finally {
            setLoading(false)
        }
    }, [isSupported, user])

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
