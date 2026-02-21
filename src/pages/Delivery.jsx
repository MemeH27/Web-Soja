import { useState, useEffect, useCallback } from 'react'
import { FaMotorcycle, FaBox, FaMapMarkerAlt, FaCheckCircle, FaSignOutAlt, FaPhone, FaClock, FaTimes, FaUser, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import PushNotificationToggle from '../components/shared/PushNotificationToggle'

function DeliveryAssignmentToast({ order, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 8000)
        return () => clearTimeout(timer)
    }, [onDismiss])

    return (
        <div
            className="fixed right-4 z-[9999] bg-[#111] border border-blue-500/40 rounded-3xl p-5 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-right duration-500 max-w-md"
            style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        >
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 text-2xl">
                    🛵
                </div>
                <div className="flex-1">
                    <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">Pedido Asignado</p>
                    <p className="text-white font-bold text-base">{order.client_name}</p>
                    <p className="text-gray-300 text-sm">Total: L {Number(order.total || 0).toFixed(2)}</p>
                </div>
                <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors text-lg leading-none">×</button>
            </div>
        </div>
    )
}

function NewDeliveryCodeModal({ code, onClose }) {
    return (
        <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[#111] border border-[#e5242c]/40 rounded-[2.2rem] p-8 text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-20 h-20 mx-auto mb-5 bg-[#e5242c]/10 text-[#e5242c] rounded-full flex items-center justify-center text-4xl">
                    🛵
                </div>
                <p className="text-[#e5242c] text-[11px] font-black uppercase tracking-[0.18rem] mb-2">Ya Eres Repartidor</p>
                <h3 className="text-white text-2xl font-black mb-5">Tu codigo de acceso es</h3>
                <div className="bg-black/60 border-2 border-dashed border-[#e5242c]/40 rounded-3xl p-6 mb-5">
                    <p className="text-white text-6xl font-black tracking-[0.6rem] leading-none">{code || '----'}</p>
                </div>
                <p className="text-yellow-400/90 text-xs font-black uppercase tracking-wider mb-7">
                    Por favor no lo compartas con nadie
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#e5242c] hover:bg-[#c41e25] text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}

export default function Delivery({ setView }) {
    const { profile, signOut, user, loading: authLoading, signInWithCode } = useAuth()
    const [orders, setOrders] = useState([])
    const [isOrdersLoading, setIsOrdersLoading] = useState(false)
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [deliveryView, setDeliveryView] = useState('login')
    const [accessCode, setAccessCode] = useState('')
    const [generatedCode, setGeneratedCode] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [watchId, setWatchId] = useState(null)
    const [deliveryToastOrder, setDeliveryToastOrder] = useState(null)
    const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false)
    const [showCode, setShowCode] = useState(false)
    const [activeTab, setActiveTab] = useState('orders') // 'orders' or 'history'
    const [loginMessage, setLoginMessage] = useState('')

    const MAX_LOGIN_ATTEMPTS = 5
    const LOCK_DURATION_MS = 15 * 60 * 1000
    const ATTEMPTS_KEY = 'soja_delivery_login_attempts'
    const LOCK_KEY = 'soja_delivery_login_lock_until'

    const playDeliveryToastSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)
            oscillator.frequency.setValueAtTime(740, ctx.currentTime)
            oscillator.frequency.setValueAtTime(988, ctx.currentTime + 0.12)
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.45)
        } catch (e) {
            console.log('Delivery notification sound not available')
        }
    }, [])

    useEffect(() => {
        console.log('📦 Delivery Render:', {
            hasUser: !!user,
            hasProfile: !!profile,
            authLoading,
            isLoggingIn,
            accessCodeLen: accessCode.length
        })
    }, [user, profile, authLoading, isLoggingIn, accessCode])

    // Safety watchdog for stuck loading state
    useEffect(() => {
        let timer
        if (isLoggingIn) {
            timer = setTimeout(() => {
                console.warn('⚠️ Login watchdog triggered: Force clearing loading state')
                setIsLoggingIn(false)
            }, 10000)
        }
        return () => clearTimeout(timer)
    }, [isLoggingIn])

    // useCallback para que el realtime subscription siempre use la versión
    // actualizada con el activeTab correcto (evita stale closure).
    // Debe declararse ANTES de los useEffect que lo usan como dependencia.
    const fetchAssignedOrders = useCallback(async () => {
        if (!user) return
        setIsOrdersLoading(true)
        setIsRefreshing(true)

        let query = supabase
            .from('orders')
            .select('*')
            .eq('delivery_id', user.id)
            .order('created_at', { ascending: false })

        if (activeTab === 'orders') {
            query = query.in('status', ['prepared', 'shipped'])
        } else {
            query = query.eq('status', 'delivered')
        }

        const { data } = await query

        if (data) setOrders(data)
        setIsOrdersLoading(false)
        setTimeout(() => setIsRefreshing(false), 500)
    }, [user, activeTab])

    // Refrescar pedidos cuando cambia el tab activo o cuando el usuario se loguea
    useEffect(() => {
        if (user && profile) {
            fetchAssignedOrders()
        }
    }, [activeTab, user, profile, fetchAssignedOrders])

    // Suscripción realtime para detectar asignación de pedidos y cambios de estado
    useEffect(() => {
        if (!user || !profile) return

        // Usamos un nombre de canal único por usuario para evitar conflictos
        // entre múltiples repartidores conectados simultáneamente.
        // Escuchamos TODOS los updates de orders y filtramos en el callback
        // porque Supabase Realtime con filter=delivery_id puede no capturar
        // el momento exacto en que delivery_id cambia de NULL a nuestro ID.
        const channelName = `delivery_orders_${user.id}`
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
            }, (payload) => {
                const newOrder = payload.new
                const oldOrder = payload.old

                // Detectar cuando se nos asigna un pedido (delivery_id cambia a nuestro ID)
                const justAssignedToUs = newOrder?.delivery_id === user.id && oldOrder?.delivery_id !== user.id
                // Detectar actualizaciones de pedidos que ya son nuestros
                const isOurOrder = newOrder?.delivery_id === user.id

                if (justAssignedToUs) {
                    setDeliveryToastOrder(newOrder)
                    playDeliveryToastSound()
                }

                if (isOurOrder) {
                    fetchAssignedOrders()
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(subscription)
        }
    }, [user, profile, playDeliveryToastSound, fetchAssignedOrders])

    const updateStatus = async (orderId, newStatus) => {
        const oldOrder = orders.find(o => o.id === orderId) || null

        const { data: updatedOrder, error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select()
            .single()

        if (error) {
            alert(error.message)
            return
        }

        if (newStatus === 'shipped') {
            startTracking()
        } else if (newStatus === 'delivered') {
            stopTracking()
            setDeliveryView('delivered_success')
        }

        if (newStatus !== 'delivered') {
            fetchAssignedOrders()
        }
    }

    const startTracking = () => {
        if (!navigator.geolocation) return

        const id = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                await supabase
                    .from('profiles')
                    .update({
                        last_lat: latitude,
                        last_lng: longitude,
                        last_location_update: new Date().toISOString()
                    })
                    .eq('id', user.id)
            },
            (err) => console.error('GPS Error:', err),
            { enableHighAccuracy: true }
        )
        setWatchId(id)
    }

    const stopTracking = () => {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId)
            setWatchId(null)
        }
    }

    useEffect(() => {
        return () => stopTracking()
    }, [watchId])

    const handleCodeLogin = async (e) => {
        if (e) e.preventDefault()
        if (isLoggingIn || accessCode.length < 4) return

        const lockUntil = Number(localStorage.getItem(LOCK_KEY) || 0)
        if (lockUntil > Date.now()) {
            const mins = Math.ceil((lockUntil - Date.now()) / 60000)
            setLoginMessage(`Acceso temporalmente bloqueado. Intenta de nuevo en ${mins} min.`)
            return
        }

        setLoginMessage('')
        setIsLoggingIn(true)
        try {
            const { error } = await signInWithCode(accessCode)
            if (error) {
                throw new Error(error.message || 'Codigo no valido o trabajador no encontrado')
            }
            localStorage.removeItem(ATTEMPTS_KEY)
            localStorage.removeItem(LOCK_KEY)
        } catch (err) {
            const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) || 0) + 1
            localStorage.setItem(ATTEMPTS_KEY, String(attempts))
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                const nextLockUntil = Date.now() + LOCK_DURATION_MS
                localStorage.setItem(LOCK_KEY, String(nextLockUntil))
                localStorage.setItem(ATTEMPTS_KEY, '0')
                setLoginMessage('Demasiados intentos fallidos. Acceso bloqueado por 15 minutos.')
            }
            alert(err.message)
            setIsLoggingIn(false)
        } finally {
            setTimeout(() => {
                if (!user) setIsLoggingIn(false)
            }, 3000)
        }
    }

    const handleLogout = async () => {
        await signOut()
        setDeliveryView('login')
        setAccessCode('')
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Verificando acceso...</p>
            </div>
        )
    }
    if (user && profile && profile.role !== 'delivery') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-2">Acceso denegado</h2>
                    <p className="text-gray-500 text-sm mb-8">Esta cuenta no tiene permisos de repartidor.</p>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-[#e5242c] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm"
                    >
                        Cerrar sesion
                    </button>
                </div>
            </div>
        )
    }
    // --- VISTAS DE LOGIN / REGISTRO ---
    if (!user) {
        if (deliveryView === 'login') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in duration-500 text-center relative z-[1001]">
                        <div className="w-20 h-20 bg-[#e5242c]/10 rounded-full flex items-center justify-center text-[#e5242c] mx-auto mb-6">
                            <FaMotorcycle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Portal de Reparto</h2>
                        <p className="text-gray-500 text-sm mb-8">Ingresa tu código de acceso para ver tus pedidos.</p>

                        <form onSubmit={handleCodeLogin} className="space-y-4 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black ml-4">Código de Acceso</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 1542"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-6 outline-none focus:border-[#e5242c] transition-all text-center text-3xl font-bold tracking-[1rem] placeholder:tracking-normal placeholder:text-lg"
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                />
                            </div>
                            <button
                                disabled={isLoggingIn || accessCode.length < 4}
                                className="w-full bg-[#1e1e1e] border-2 border-[#e5242c] text-white py-5 rounded-2xl font-black hover:bg-[#e5242c] transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-sm"
                            >
                                {isLoggingIn ? 'Validando...' : 'Validar y Entrar'} <FaArrowRight />
                            </button>
                            {loginMessage && (
                                <p className="text-[11px] text-yellow-500 font-bold text-center">{loginMessage}</p>
                            )}
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <p className="text-gray-500 text-sm text-center">
                                Alta de repartidores deshabilitada en este panel. Solicitala al administrador.
                            </p>
                        </div>
                    </div>
                    {showNewDeliveryModal && (
                        <NewDeliveryCodeModal
                            code={generatedCode}
                            onClose={() => setShowNewDeliveryModal(false)}
                        />
                    )}
                </div>
            )
        }

        if (deliveryView === 'register') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-2">Registro deshabilitado</h2>
                        <p className="text-gray-500 text-sm mb-8">
                            Por seguridad, el alta de repartidores se realiza solo desde el panel administrativo.
                        </p>
                        <button
                            type="button"
                            onClick={() => setDeliveryView('login')}
                            className="w-full bg-[#e5242c] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm"
                        >
                            Volver al login
                        </button>
                    </div>
                </div>
            )
        }

        if (deliveryView === 'showCode') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 text-center">
                    <div className="bg-[#111] border border-green-500/30 p-10 rounded-[3rem] w-full max-w-md animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                            <FaCheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">¡Todo Listo!</h2>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Tu cuenta ha sido creada. Guarda este código como oro, es tu llave para entrar a trabajar.</p>

                        <div className="bg-black/50 border-2 border-dashed border-green-500/30 rounded-3xl p-8 mb-8">
                            <p className="text-green-500 text-[10px] uppercase font-black mb-2 tracking-widest">Tu Código de Acceso</p>
                            <p className="text-white text-5xl font-black tracking-[0.5rem]">{generatedCode}</p>
                        </div>

                        <p className="text-yellow-500/80 text-[10px] uppercase font-bold mb-8 italic">⚠️ NO COMPARTAS ESTE CÓDIGO CON NADIE</p>

                        <button
                            onClick={handleLogout}
                            className="bg-white text-black w-full py-5 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                        >
                            Entendido, ir al Login
                        </button>
                    </div>
                </div>
            )
        }
        if (deliveryView === 'delivered_success') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 text-center">
                    <div className="bg-[#111] border border-green-500/30 p-10 rounded-[3rem] w-full max-w-md animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                            <FaCheckCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-black mb-3">¡Excelente Trabajo! 🛵</h2>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Has entregado el pedido con éxito. Gracias por ser parte del equipo de SOJA.
                            <br /><br />
                            <span className="text-white font-bold">"Buen provecho y gracias por comprar con nosotros"</span>
                        </p>
                        <button
                            onClick={() => {
                                setDeliveryView('login')
                                fetchAssignedOrders()
                            }}
                            className="bg-green-600 text-white w-full py-5 rounded-2xl font-black hover:bg-green-700 transition-all uppercase tracking-widest text-sm shadow-xl shadow-green-600/20"
                        >
                            Volver a Inicio
                        </button>
                    </div>
                </div>
            )
        }
    }

    // --- DASHBOARD DE REPARTO (LOGUEADO) ---
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {deliveryToastOrder && (
                <DeliveryAssignmentToast
                    order={deliveryToastOrder}
                    onDismiss={() => setDeliveryToastOrder(null)}
                />
            )}
            {showNewDeliveryModal && (
                <NewDeliveryCodeModal
                    code={generatedCode}
                    onClose={() => setShowNewDeliveryModal(false)}
                />
            )}
            {/* Header */}
            <header className="bg-[#111] border-b border-white/10 p-4 md:p-6 sticky top-0 z-50 flex justify-between items-center backdrop-blur-md bg-opacity-80 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="flex items-center gap-3">
                    <img src="/img/logo/logo_blanco.png" alt="SOJA" className="h-7 md:h-8" />
                    <div className="flex flex-col">
                        <span className="bg-[#e5242c] text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 rounded uppercase tracking-widest w-fit">Repartidor</span>
                        <span className="text-[9px] md:text-[10px] text-gray-400 mt-1 font-mono uppercase tracking-tighter hidden sm:block">
                            {profile?.first_name} | Cod: {profile?.delivery_id_card}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {watchId && (
                        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 animate-pulse">
                            <FaMapMarkerAlt size={10} />
                            <span className="text-[10px] font-black uppercase tracking-widest">GPS Activo</span>
                        </div>
                    )}
                    <PushNotificationToggle user={user} role="delivery" compact />
                    <button
                        onClick={fetchAssignedOrders}
                        className={`w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#e5242c] rounded-xl flex items-center justify-center transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Refrescar Pedidos"
                    >
                        <FaClock size={16} />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5"
                    >
                        <FaSignOutAlt size={18} />
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Panel de Entregas 🛵</h2>
                    <p className="text-gray-500 text-sm leading-tight mb-6">
                        Hola, <strong>{profile?.first_name || 'Repartidor'}</strong>. Gestiona tus entregas aquí.
                    </p>

                    <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'orders' ? 'bg-[#e5242c] text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Pedidos Activos ({activeTab === 'orders' ? orders.length : '...'})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'history' ? 'bg-[#e5242c] text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Historial ({activeTab === 'history' ? orders.length : '...'})
                        </button>
                    </div>
                </div>

                <div className="mb-8 bg-[#111] border border-[#e5242c]/30 rounded-3xl p-6 text-center shadow-xl relative group">
                    <p className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.22rem] mb-2">Tu Codigo de Acceso</p>
                    <div className="flex items-center justify-center gap-4">
                        <p className="text-white text-5xl md:text-6xl font-black tracking-[0.55rem] leading-none transition-all duration-300">
                            {showCode ? (profile?.delivery_id_card || '----') : '••••'}
                        </p>
                        <button
                            onClick={() => setShowCode(!showCode)}
                            className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/5"
                            title={showCode ? "Ocultar Código" : "Mostrar Código"}
                        >
                            {showCode ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                        </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-3 uppercase tracking-wider">No lo compartas con nadie</p>
                </div>

                {isOrdersLoading ? (
                    <div className="text-center py-20 text-gray-500 italic">Actualizando hoja de pedidos...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-10 text-center space-y-4">
                        <p className="text-gray-400 font-medium italic">No tienes pedidos asignados por ahora.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {orders.map(order => {
                            const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
                            const isHistory = activeTab === 'history'

                            return (
                                <div key={order.id} className={`bg-[#111] border ${isHistory ? 'border-white/5' : 'border-white/10'} rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col`}>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : order.status === 'shipped' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {order.status === 'delivered' ? 'Entregado' : order.status === 'shipped' ? 'En Camino' : 'Listo para Salir'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500 uppercase font-mono">#{order.id.slice(0, 8)}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 mb-4">
                                            <h3 className="text-xl font-black text-white leading-tight">{order.client_name}</h3>
                                            <p className="text-gray-400 text-xs font-bold flex items-center gap-2">
                                                <FaPhone size={10} className="text-green-500" /> {order.client_phone}
                                            </p>
                                        </div>

                                        {isHistory && (
                                            <div className="mb-4 bg-white/5 rounded-2xl p-3 border border-white/5">
                                                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                                                    <FaClock size={10} /> Entregado el:
                                                </div>
                                                <p className="text-white text-xs font-bold">
                                                    {new Date(order.updated_at || order.created_at).toLocaleString('es-HN', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        )}

                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2 mb-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-1.5 bg-[#e5242c]/10 rounded-lg text-[#e5242c] shrink-0">
                                                    <FaMapMarkerAlt size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Dirección</p>
                                                    <p className="text-xs text-white font-bold leading-snug truncate">
                                                        {order.address || 'Ver en mapa'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6 flex-1">
                                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2 px-1">Resumen</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {items.slice(0, 3).map((item, i) => (
                                                    <span key={i} className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-300">
                                                        {item.qty || item.quantity}x {item.name.split(' ')[0]}
                                                    </span>
                                                ))}
                                                {items.length > 3 && (
                                                    <span className="text-[10px] font-bold text-gray-500 py-1 ml-1">+{items.length - 3} más</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 mt-auto">
                                            {!isHistory && (
                                                <>
                                                    {order.status === 'prepared' ? (
                                                        <button
                                                            onClick={() => updateStatus(order.id, 'shipped')}
                                                            className="w-full bg-blue-600 text-white py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                                                        >
                                                            <FaMotorcycle size={14} /> Iniciar Entrega
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateStatus(order.id, 'delivered')}
                                                            className="w-full bg-green-600 text-white py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-600/20"
                                                        >
                                                            <FaCheckCircle size={14} /> Finalizar Entrega
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className={`w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-3 rounded-[1rem] font-black uppercase text-[9px] tracking-widest border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-2`}
                                            >
                                                <FaBox size={12} /> Ver Detalles Completos
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Detalles */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    isHistory={activeTab === 'history'}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    )
}

function OrderDetailsModal({ order, isHistory, onClose }) {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])

    // Fallback for location and address
    const lat = order.latitude || order.location?.lat || order.lat
    const lng = order.longitude || order.location?.lng || order.lng
    const displayAddress = order.address || order.location?.address || (typeof order.location === 'string' ? order.location : null) || 'Dirección no especificada'

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-xl mx-auto w-full bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300 mb-8 mt-4">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors border border-white/10 z-10"
                >
                    <FaTimes size={18} />
                </button>

                {/* Header Modal */}
                <div className="p-8 pb-4 border-b border-white/5">
                    <p className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.2rem] mb-2">Detalles del Pedido</p>
                    <h2 className="text-3xl font-black text-white leading-tight">#{order.id.slice(0, 8).toUpperCase()}</h2>
                </div>

                <div className="p-8 space-y-8">
                    {/* Client Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c]">
                                <FaUser size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-black">Cliente</p>
                                <p className="text-lg font-bold text-white leading-none">{order.client_name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                                <FaPhone size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-black">Teléfono</p>
                                <a href={`tel:${order.client_phone}`} className="text-lg font-bold text-white hover:text-green-500 transition-colors leading-none">{order.client_phone}</a>
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 relative group">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-2.5 bg-[#e5242c]/10 rounded-xl text-[#e5242c]">
                                    <FaMapMarkerAlt size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Dirección de Entrega</p>
                                    <p className="text-sm text-gray-200 leading-relaxed font-medium">{displayAddress}</p>
                                </div>
                            </div>

                            {!isHistory && (
                                <div className="flex flex-col gap-3 mt-4">
                                    {(lat && lng) && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-[#1e1e1e] border-2 border-[#e5242c] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#e5242c] transition-all shadow-lg text-[10px] uppercase tracking-widest active:scale-95"
                                        >
                                            <FaMapMarkerAlt size={16} /> Abrir en Google Maps
                                        </a>
                                    )}
                                    {order.client_phone && (
                                        <a
                                            href={`https://wa.me/504${order.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${order.client_name}! 🛵 Soy tu repartidor de SOJA, ya estoy en camino con tu pedido. ¡Llegaré en unos minutos!`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-[#25D366]/10 border-2 border-[#25D366]/20 text-[#25D366] py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#25D366] hover:text-white transition-all shadow-lg text-[10px] uppercase tracking-widest active:scale-95"
                                        >
                                            <FaPhone size={14} /> Avisar por WhatsApp
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <FaBox size={14} className="text-[#e5242c]" /> Resumen del Pedido
                            </h3>
                            <span className="text-xs text-gray-500 font-bold">{items.length} items</span>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-[#e5242c] text-white rounded-lg flex items-center justify-center font-black text-sm">
                                            {item.qty || item.quantity || 1}
                                        </div>
                                        <span className="text-white font-bold text-sm tracking-tight">{item.name}</span>
                                    </div>
                                    <span className="text-gray-500 font-mono text-sm">L {Number(item.total || (item.price * (item.qty || item.quantity || 1)) || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Section */}
                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                        <span className="text-gray-400 font-black uppercase tracking-widest text-xs">Total del Pedido</span>
                        <span className="text-3xl font-black text-[#e5242c] tracking-tight">L {Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
