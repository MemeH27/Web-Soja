import { usePushNotifications } from '../hooks/usePushNotifications'

export default function PushNotificationToggle({ user, role = 'user', compact = false }) {
    const {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        phase,
        subscribe,
        unsubscribe,
    } = usePushNotifications({ user, role })

    if (!user || !isSupported) return null

    const isDenied = permission === 'denied'
    const label = isSubscribed ? 'Push activas' : 'Activar push'

    const handleClick = async () => {
        if (loading || isDenied) return
        if (isSubscribed) await unsubscribe()
        else await subscribe()
    }

    return (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
            <button
                type="button"
                disabled={loading || isDenied}
                onClick={handleClick}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-colors disabled:opacity-40 ${isSubscribed
                        ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                        : 'bg-[#e5242c]/10 text-[#e5242c] border-[#e5242c]/30 hover:bg-[#e5242c]/20'
                    }`}
                title={isDenied ? 'Habilita notificaciones en la configuracion del navegador' : 'Activar o desactivar notificaciones push'}
            >
                {loading ? 'Configurando...' : label}
            </button>
            {loading && (
                <p className="text-[11px] text-gray-400">Paso: {phase}</p>
            )}
            {isDenied && (
                <p className="text-[11px] text-yellow-500">Notificaciones bloqueadas en el navegador.</p>
            )}
            {error && (
                <p className="text-[11px] text-red-400">{error}</p>
            )}
        </div>
    )
}
