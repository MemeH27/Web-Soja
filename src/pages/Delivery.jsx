import { useState, useEffect } from 'react'
import { FaMotorcycle, FaBox, FaMapMarkerAlt, FaCheckCircle, FaSignOutAlt, FaPhone, FaClock, FaTimes, FaUser } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Delivery({ setView }) {
    const { profile, signOut, user, loading: authLoading, signInWithCode, registerStaff } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setLocalView] = useState('login') // 'login', 'register', 'showCode'
    const [accessCode, setAccessCode] = useState('')
    const [newStaffData, setNewStaffData] = useState({ firstName: '', lastName: '', phone: '' })
    const [generatedCode, setGeneratedCode] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

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
                }, () => {
                    fetchAssignedOrders()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(subscription)
            }
        }
    }, [user, profile])

    const fetchAssignedOrders = async () => {
        setLoading(true)
        setIsRefreshing(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('delivery_id', user.id)
            .in('status', ['prepared', 'shipped'])
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setLoading(false)
        setTimeout(() => setIsRefreshing(false), 500)
    }

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) alert(error.message)
        else fetchAssignedOrders()
    }

    const handleCodeLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await signInWithCode(accessCode)
            if (error) throw new Error('Código no válido o trabajador no encontrado')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRegisterStaff = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { code, error } = await registerStaff(
                newStaffData.firstName,
                newStaffData.lastName,
                newStaffData.phone
            )
            if (error) throw error
            setGeneratedCode(code)
            setLocalView('showCode')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        setLocalView('login')
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
        if (view === 'login') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in duration-500 text-center">
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
                                disabled={loading || accessCode.length < 4}
                                className="w-full bg-[#e5242c] text-white py-5 rounded-2xl font-bold hover:bg-[#c41e25] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
                            >
                                {loading ? 'Validando...' : 'Iniciar Turno'} <FaCheckCircle />
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <button
                                onClick={() => setLocalView('register')}
                                className="text-gray-500 hover:text-white transition-colors text-sm"
                            >
                                Soy un nuevo repartidor
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        if (view === 'register') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md animate-in slide-in-from-right duration-500">
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
                                disabled={loading}
                                className="w-full bg-[#e5242c] text-white py-5 rounded-2xl font-bold hover:bg-[#c41e25] transition-all disabled:opacity-50 mt-4"
                            >
                                {loading ? 'Generando Acceso...' : 'Registrarme y Obtener Código'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocalView('login')}
                                className="w-full text-gray-500 text-sm py-2"
                            >
                                Volver al inicio
                            </button>
                        </form>
                    </div>
                </div>
            )
        }

        if (view === 'showCode') {
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
    }

    // --- DASHBOARD DE REPARTO (LOGUEADO) ---
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
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

                {loading ? (
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
                                    <p className="text-sm text-gray-200 leading-relaxed font-medium">{order.address}</p>
                                </div>
                            </div>

                            {(order.latitude && order.longitude) && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-[#e5242c] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#c41e25] transition-all shadow-lg text-sm uppercase tracking-widest active:scale-95"
                                >
                                    <FaMapMarkerAlt /> Abrir en Google Maps
                                </a>
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
                                            {item.quantity}
                                        </div>
                                        <span className="text-white font-bold text-sm tracking-tight">{item.name}</span>
                                    </div>
                                    <span className="text-gray-500 font-mono text-sm">L {Number(item.price * item.quantity).toFixed(2)}</span>
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
