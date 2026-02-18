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
    if (name === 'InvalidAccessError') return 'La clave VAPID publica no es valida para este navegador.'
    if (name === 'SecurityError') return 'Push requiere HTTPS o contexto seguro para funcionar.'
    if (/standalone|pantalla de inicio|home screen/i.test(message)) return message
    if (/No se pudo crear la suscripcion Push/i.test(message)) {
        return 'No se pudo crear la suscripcion Push. Revisa bloqueo de notificaciones del navegador/sistema y vuelve a intentar.'
    }
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

async function waitForExistingSubscription(registration, attempts = 6, delayMs = 1000) {
    for (let i = 0; i < attempts; i += 1) {
        const sub = await registration.pushManager.getSubscription()
        if (sub) return sub
        await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return null
}

export function usePushNotifications({ user, role = 'user' }) {
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    )
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [phase, setPhase] = useState('idle')

    const isSupported = useMemo(() => {
        return typeof window !== 'undefined'
            && 'serviceWorker' in navigator
            && 'PushManager' in window
            && 'Notification' in window
    }, [])

    const debug = useCallback((message, extra = null) => {
        const id = user?.id ? user.id.slice(0, 8) : 'guest'
        if (extra !== null) {
            console.log(`[push:${role}:${id}] ${message}`, extra)
            return
        }
        console.log(`[push:${role}:${id}] ${message}`)
    }, [role, user?.id])

    const syncSubscriptionState = useCallback(async () => {
        setPhase('sync_state')
        if (!isSupported || !user) {
            setIsSubscribed(false)
            setPhase('idle')
            return
        }
        debug('syncSubscriptionState start')
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
        debug('syncSubscriptionState done', { hasSubscription: Boolean(sub) })
        setPhase('idle')
    }, [debug, isSupported, user])

    const saveSubscription = useCallback(async (subscription) => {
        if (!user) throw new Error('Necesitas iniciar sesion para activar notificaciones push.')

        const { endpoint, p256dh, auth } = getSubscriptionKeys(subscription)
        debug('saveSubscription payload ready', { endpoint: endpoint?.slice(0, 60) })
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
        debug('saveSubscription upsert success')
    }, [debug, role, user])

    const subscribe = useCallback(async () => {
        if (!isSupported) throw new Error('Este dispositivo no soporta Push Notifications.')
        if (!user) throw new Error('Necesitas iniciar sesion para activar notificaciones push.')

        const vapidPublicKey = normalizeVapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY)
        if (!vapidPublicKey) throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY en el frontend.')
        if (vapidPublicKey.length < 40) throw new Error('VITE_VAPID_PUBLIC_KEY no tiene un formato valido.')

        setLoading(true)
        setError(null)
        setPhase('starting')
        debug('subscribe start', {
            isSecureContext,
            permission: Notification.permission,
            hasServiceWorkerController: Boolean(navigator.serviceWorker?.controller),
            userAgent: navigator.userAgent,
        })
        let failed = false
        try {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
            if (isIOS && !isStandalone) {
                throw new Error('En iPhone/iPad debes abrir la app desde la pantalla de inicio para activar Push.')
            }

            setPhase('service_worker_ready')
            const registration = await withTimeout((async () => {
                const byScope = await navigator.serviceWorker.getRegistration('/')
                if (byScope) return byScope
                return navigator.serviceWorker.ready
            })(), 10000, 'No se pudo obtener el Service Worker.')
            debug('service worker ready ok')
            let nextPermission = Notification.permission

            if (nextPermission !== 'granted') {
                setPhase('request_permission')
                debug('requesting notification permission')
                nextPermission = await withTimeout(
                    Notification.requestPermission(),
                    15000,
                    'El permiso de notificaciones no respondio a tiempo.'
                )
                setPermission(nextPermission)
                debug('permission result', nextPermission)
            }
            if (nextPermission !== 'granted') {
                throw new Error('Permiso de notificaciones denegado.')
            }

            setPhase('permission_state_check')
            try {
                const state = await registration.pushManager.permissionState({
                    userVisibleOnly: true,
                    applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
                })
                debug('push permissionState', state)
                if (state === 'denied') {
                    throw new Error('El navegador bloqueó Push Notifications para este sitio.')
                }
            } catch (permErr) {
                debug('permissionState check warning', permErr)
            }

            setPhase('read_existing_subscription')
            let subscription = await withTimeout(
                registration.pushManager.getSubscription(),
                10000,
                'No se pudo leer la suscripcion Push.'
            )
            if (!subscription) {
                setPhase('create_subscription')
                const subscribeAttempt = async () => registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
                })

                try {
                    subscription = await withTimeout(
                        subscribeAttempt(),
                        25000,
                        'No se pudo crear la suscripcion Push.'
                    )
                    debug('subscribe created on first attempt')
                } catch (firstErr) {
                    debug('first subscribe attempt failed', {
                        name: firstErr?.name,
                        message: firstErr?.message,
                        stack: firstErr?.stack,
                    })

                    const lateSubscription = await waitForExistingSubscription(registration, 5, 1000)
                    if (lateSubscription) {
                        subscription = lateSubscription
                        debug('late subscription recovered after first failure')
                    } else {
                        debug('trying cleanup + retry after first failure')
                        const stale = await registration.pushManager.getSubscription()
                        if (stale) {
                            try { await stale.unsubscribe() } catch (_) { }
                        }
                        subscription = await withTimeout(
                            subscribeAttempt(),
                            25000,
                            mapPushError(firstErr)
                        )
                        debug('subscribe created after retry')
                    }
                }
            }

            setPhase('save_subscription_db')
            await withTimeout(
                saveSubscription(subscription),
                10000,
                'No se pudo guardar la suscripcion en la base de datos.'
            )
            setPhase('sync_after_save')
            await syncSubscriptionState()
            setPhase('done')
            debug('subscribe flow done')
            return { ok: true }
        } catch (err) {
            failed = true
            const mapped = mapPushError(err)
            setError(mapped)
            setPhase('error')
            debug('subscribe flow failed', { raw: err, mapped })
            return { ok: false, error: err }
        } finally {
            setLoading(false)
            if (!failed) setPhase('idle')
        }
    }, [debug, isSupported, saveSubscription, syncSubscriptionState, user])

    const unsubscribe = useCallback(async () => {
        if (!isSupported || !user) return
        setLoading(true)
        setError(null)
        setPhase('unsubscribe_start')
        debug('unsubscribe start')
        let failed = false
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
            setPhase('done')
            debug('unsubscribe done')
        } catch (err) {
            failed = true
            const mapped = mapPushError(err)
            setError(mapped)
            setPhase('error')
            debug('unsubscribe failed', { raw: err, mapped })
            return { ok: false, error: err }
        } finally {
            setLoading(false)
            if (!failed) setPhase('idle')
        }
    }, [debug, isSupported, syncSubscriptionState, user])

    useEffect(() => {
        if (!isSupported) return
        setPermission(Notification.permission)
    }, [isSupported])

    useEffect(() => {
        syncSubscriptionState().catch((err) => {
            debug('initial sync failed', err)
            setIsSubscribed(false)
            setPhase('error')
            setError(mapPushError(err))
        })
    }, [syncSubscriptionState])

    useEffect(() => {
        if (!loading) return
        const watchdog = setTimeout(() => {
            setLoading(false)
            setPhase('error')
            setError('El proceso tardó demasiado. Recarga la página y vuelve a intentar.')
            debug('global loading watchdog fired')
        }, 30000)
        return () => clearTimeout(watchdog)
    }, [debug, loading])

    return {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        phase,
        subscribe,
        unsubscribe,
        syncSubscriptionState,
    }
}
