import { usePushNotifications } from '../../hooks/usePushNotifications'
import { FaBell, FaBellSlash } from 'react-icons/fa'

export default function PushNotificationToggle({ user, role = 'user', compact = false, inline = false }) {
    const {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        subscribe,
        unsubscribe,
    } = usePushNotifications({ user, role })

    if (!user || !isSupported) return null

    const isDenied = permission === 'denied'

    const handleClick = async () => {
        if (loading || isDenied) return
        if (isSubscribed) await unsubscribe()
        else await subscribe()
    }

    if (compact) {
        return (
            <button
                onClick={handleClick}
                disabled={loading || isDenied}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border backdrop-blur-md ${isSubscribed
                    ? 'bg-green-500/10 border-green-500/30 text-green-500'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    } ${loading ? 'animate-pulse' : ''}`}
                title={isDenied ? 'Notificaciones bloqueadas' : 'Notificaciones Push'}
            >
                {isSubscribed ? <FaBell size={16} /> : <FaBellSlash size={16} />}
            </button>
        )
    }

    return (
        <div className={inline ? "relative" : "fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom duration-500"}>
            <button
                onClick={handleClick}
                disabled={loading || isDenied}
                className={`group flex items-center gap-3 ${inline ? 'px-4 py-3' : 'px-6 py-4'} rounded-[2rem] border backdrop-blur-xl shadow-2xl transition-all active:scale-95 ${isSubscribed
                    ? 'bg-green-600/20 border-green-500/30 text-green-400 shadow-green-900/20'
                    : 'bg-white/5 border-white/10 text-white shadow-black/40 hover:bg-white/10'
                    } ${loading ? 'opacity-70 cursor-wait' : ''} ${inline ? 'w-full' : ''}`}
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:rotate-12 ${isSubscribed ? 'bg-green-500 text-white' : 'bg-[#e5242c] text-white'
                    }`}>
                    {isSubscribed ? <FaBell size={18} /> : <FaBellSlash size={18} />}
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Notificaciones</p>
                    <p className="text-sm font-bold leading-none">
                        {loading ? 'Configurando...' : isSubscribed ? 'Activadas' : 'Desactivadas'}
                    </p>
                </div>
            </button>

            {isDenied && (
                <div className={`${inline ? 'mt-2 relative' : 'absolute bottom-full right-0 mb-4'} w-64 bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md p-4 rounded-2xl animate-in zoom-in duration-300`}>
                    <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider text-center">
                        Permiso denegado. Actívalo en la configuración de tu navegador para recibir alertas.
                    </p>
                </div>
            )}

            {error && (
                <div className={`${inline ? 'mt-2 relative' : 'absolute bottom-full right-0 mb-4'} w-64 bg-red-500/10 border border-red-500/20 backdrop-blur-md p-4 rounded-2xl animate-in zoom-in duration-300`}>
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider text-center">
                        {error}
                    </p>
                </div>
            )}
        </div>
    )
}
