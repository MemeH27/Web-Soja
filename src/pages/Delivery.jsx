import { useState, useEffect, useCallback } from 'react'
import { FaMotorcycle, FaBox, FaMapMarkerAlt, FaCheckCircle, FaSignOutAlt, FaPhone, FaClock, FaTimes, FaUser, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import PushNotificationToggle from '../components/PushNotificationToggle'

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
    const { profile, signOut, user, loading: authLoading, signInWithCode, registerStaff } = useAuth()
    const [orders, setOrders] = useState([])
    const [isOrdersLoading, setIsOrdersLoading] = useState(false)
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [deliveryView, setDeliveryView] = useState('login')
    const [accessCode, setAccessCode] = useState('')
    const [newStaffData, setNewStaffData] = useState({ firstName: '', lastName: '', phone: '' })
    const [generatedCode, setGeneratedCode] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [watchId, setWatchId] = useState(null)
    const [deliveryToastOrder, setDeliveryToastOrder] = useState(null)
    const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false)
    const [showCode, setShowCode] = useState(false)

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

    useEffect(() => {
        if (user && profile) {
            fetchAssignedOrders()
            // Suscribirse a cambios en tiempo real
            const subscription = supabase
                .channel('delivery_orders')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `delivery_id=eq.${user.id}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setDeliveryToastOrder(payload.new)
                        playDeliveryToastSound()
                    }
                    if (payload.eventType === 'UPDATE' && payload.old?.delivery_id !== payload.new?.delivery_id) {
                        setDeliveryToastOrder(payload.new)
                        playDeliveryToastSound()
                    }
                    fetchAssignedOrders()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(subscription)
            }
        }
    }, [user, profile, playDeliveryToastSound])

    const fetchAssignedOrders = async () => {
        if (!user) return
        setIsOrdersLoading(true)
        setIsRefreshing(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('delivery_id', user.id)
            .in('status', ['prepared', 'shipped'])
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setIsOrdersLoading(false)
        setTimeout(() => setIsRefreshing(false), 500)
    }

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

        console.log('🔑 Intentando login con:', accessCode)
        setIsLoggingIn(true)
        try {
            const { error } = await signInWithCode(accessCode)
            if (error) {
                console.error('❌ Login error result:', error)
                throw new Error(error.message || 'Código no válido o trabajador no encontrado')
            }
            console.log('✅ Login exitoso, esperando redirección...')
        } catch (err) {
            console.error('❌ Catch login error:', err.message)
            alert(err.message)
            setIsLoggingIn(false) // Force clear on catch
        } finally {
            // Safety: Clear loading state if no redirection happens soon
            setTimeout(() => {
                if (!user) setIsLoggingIn(false)
            }, 3000)
        }
    }

    const handleRegisterStaff = async (e) => {
        e.preventDefault()
        setIsLoggingIn(true)
        try {
            const { code, error } = await registerStaff(
                newStaffData.firstName,
                newStaffData.lastName,
                newStaffData.phone
            )
            if (error) throw error
            setGeneratedCode(code)
            setDeliveryView('login')
            setShowNewDeliveryModal(true)
        } catch (err) {
            alert(err.message)
        } finally {
            setIsLoggingIn(false)
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
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <button
                                onClick={() => setDeliveryView('register')}
                                className="text-gray-500 hover:text-white transition-colors text-sm"
                            >
                                Soy un nuevo repartidor
                            </button>
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
                    <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md animate-in slide-in-from-right duration-500 relative z-[1001]">
                        <h2 className="text-2xl font-bold text-center mb-2">Nuevo Repartidor</h2>
                        <p className="text-gray-500 text-center text-sm mb-8">Completa tus datos para generarte un código de acceso.</p>

                        <form onSubmit={handleRegisterStaff} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nombre(s)"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-[#e5242c] transition-all"
                                value={newStaffData.firstName}
                                onChange={e => setNewStaffData({ ...newStaffData, firstName: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Apellido(s)"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-[#e5242c] transition-all"
                                value={newStaffData.lastName}
                                onChange={e => setNewStaffData({ ...newStaffData, lastName: e.target.value })}
                            />
                            <input
                                type="tel"
                                placeholder="Número de Celular"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-[#e5242c] transition-all"
                                value={newStaffData.phone}
                                onChange={e => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                            />
                            <button
                                disabled={isLoggingIn}
                                className="w-full bg-[#1e1e1e] border-2 border-[#e5242c] text-white py-5 rounded-2xl font-black hover:bg-[#e5242c] transition-all disabled:opacity-30 mt-4 uppercase tracking-widest text-sm"
                            >
                                {isLoggingIn ? 'Generando Acceso...' : 'Registrarme y Obtener Código'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryView('login')}
                                className="w-full text-gray-500 text-sm py-2"
                            >
                                Volver al inicio
                            </button>
                        </form>
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
            <header className="bg-[#111] border-b border-white/10 p-4 md:p-6 sticky top-0 z-10 flex justify-between items-center backdrop-blur-md bg-opacity-80">
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

            <main className="p-6 max-w-md mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Panel de Entregas 🛵</h2>
                    <p className="text-gray-500 text-sm leading-tight">
                        Hola, <strong>{profile?.first_name || 'Repartidor'}</strong>. Tienes {orders.length} pedidos por entregar.
                    </p>
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
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${order.status === 'shipped' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {order.status === 'shipped' ? 'En Camino' : 'Listo para Salir'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 uppercase font-mono">#{order.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-1">{order.client_name}</h3>
                                    <p className="text-gray-400 text-sm flex items-center gap-2 mb-4">
                                        <FaPhone size={12} className="text-[#e5242c]" /> {order.client_phone}
                                    </p>

                                    <div className="bg-white/5 rounded-2xl p-4 flex items-start gap-3 mb-6">
                                        <FaMapMarkerAlt className="text-[#e5242c] mt-1 shrink-0" />
                                        <p className="text-sm text-gray-300 leading-tight">
                                            {order.address || 'Ver ubicación en mapa'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="col-span-2 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold border border-white/10 transition-all active:scale-95 text-sm"
                                        >
                                            Ver Detalles del Pedido
                                        </button>

                                        {order.status === 'prepared' ? (
                                            <button
                                                onClick={() => updateStatus(order.id, 'shipped')}
                                                className="col-span-2 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                            >
                                                <FaMotorcycle /> Iniciar Entrega
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(order.id, 'delivered')}
                                                className="col-span-2 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20"
                                            >
                                                <FaCheckCircle /> Finalizar Entrega
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Detalles */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    )
}

function OrderDetailsModal({ order, onClose }) {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])

    // Fallback for location and address
    const lat = order.latitude || order.location?.lat || order.lat
    const lng = order.longitude || order.location?.lng || order.lng
    const displayAddress = order.address || order.location?.address || (typeof order.location === 'string' ? order.location : null) || 'Dirección no especificada'

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col p-4 md:p-8 overflow-y-auto">
            <div className="max-w-xl mx-auto w-full bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300 mb-8">
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
