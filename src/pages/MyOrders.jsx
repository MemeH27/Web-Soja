import { useState, useEffect } from 'react'
import { FaChevronLeft, FaClock, FaBox, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaRedo, FaShoppingCart, FaArrowRight, FaTimes, FaUser, FaPhone } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function MyOrders({ onBack, setCart, setView }) {
    const { user, profile } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, delivered, cancelled
    const [selectedMonth, setSelectedMonth] = useState('all')
    const [showReorderSuccess, setShowReorderSuccess] = useState(false)
    const [viewingOrder, setViewingOrder] = useState(null)
    const [confirmingReorder, setConfirmingReorder] = useState(null)

    useEffect(() => {
        if (user) {
            fetchUserOrders()
        }
    }, [user])

    const fetchUserOrders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        if (error) console.error('Error fetching orders:', error)
        setLoading(false)
    }

    const handleConfirmReorder = (order) => {
        if (!setCart) return

        const newCart = {}
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])

        items.forEach(item => {
            const id = item.id || item.productId
            if (id) {
                newCart[id] = (newCart[id] || 0) + (item.qty || item.quantity || 1)
            }
        })

        setCart(newCart)
        setConfirmingReorder(null)
        setShowReorderSuccess(true)
    }

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filter === 'all'
            ? true
            : filter === 'delivered' ? order.status === 'delivered' : order.status === 'cancelled'

        const orderDate = new Date(order.created_at)
        const matchesMonth = selectedMonth === 'all'
            ? true
            : orderDate.getMonth() === parseInt(selectedMonth)

        return matchesStatus && matchesMonth
    })

    const months = [
        { id: '0', name: 'Enero' }, { id: '1', name: 'Febrero' }, { id: '2', name: 'Marzo' },
        { id: '3', name: 'Abril' }, { id: '4', name: 'Mayo' }, { id: '5', name: 'Junio' },
        { id: '6', name: 'Julio' }, { id: '7', name: 'Agosto' }, { id: '8', name: 'Septiembre' },
        { id: '9', name: 'Octubre' }, { id: '10', name: 'Noviembre' }, { id: '11', name: 'Diciembre' }
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-12 h-12 bg-white/5 hover:bg-[#e5242c] text-white rounded-2xl flex items-center justify-center transition-all border border-white/10 group active:scale-95"
                        >
                            <FaChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">Mis Pedidos</h2>
                            <p className="text-gray-500 text-sm mt-1">Historial completo de tus compras en SOJA.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'delivered', label: 'Entregados' },
                                { id: 'cancelled', label: 'Cancelados' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setFilter(t.id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filter === t.id ? 'bg-[#e5242c] text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#e5242c] transition-colors">
                                <FaCalendarAlt size={12} />
                            </div>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-6 py-2.5 text-xs font-bold text-white outline-none focus:border-[#e5242c] transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">Cualquier Mes</option>
                                {months.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-10 h-10 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-bold animate-pulse">Cargando tus pedidos...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-16 text-center flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-5xl opacity-20">
                            🥡
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">No se encontraron pedidos</h3>
                            <p className="text-gray-500 max-w-xs mx-auto text-sm">Prueba ajustando los filtros o realiza tu primer pedido ahora mismo.</p>
                        </div>
                        <button
                            onClick={() => onBack()}
                            className="bg-[#e5242c] text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-xl shadow-[#e5242c]/20"
                        >
                            Ver Menú
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredOrders.map(order => {
                            const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
                            return (
                                <div key={order.id} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] flex flex-col group hover:border-[#e5242c]/20 transition-all shadow-xl gap-5">
                                    <div className="flex items-start justify-between">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {order.status === 'delivered' ? <FaCheckCircle size={20} /> :
                                                order.status === 'cancelled' ? <FaTimesCircle size={20} /> :
                                                    <FaClock size={20} />}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total</p>
                                            <p className="text-lg font-black text-white tracking-tight leading-none">L {Number(order.total).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">#{order.id.slice(0, 8).toUpperCase()}</p>
                                            <span className={`text-[8px] uppercase font-black px-2 py-0.5 rounded ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {order.status === 'delivered' ? 'Entregado' :
                                                    order.status === 'cancelled' ? 'Cancelado' : 'En Proceso'}
                                            </span>
                                        </div>
                                        <p className="text-white font-bold text-sm mb-1">{items.length} productos</p>
                                        <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-1 gap-2">
                                        <button
                                            onClick={() => setConfirmingReorder(order)}
                                            className="w-full h-11 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-green-900/10 text-xs"
                                        >
                                            <FaRedo size={12} /> Pedir de nuevo
                                        </button>
                                        <button
                                            onClick={() => setViewingOrder(order)}
                                            className="w-full h-11 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95 text-xs font-bold"
                                        >
                                            Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Detalles / Confirmación de Reorder */}
            <AnimatePresence>
                {(viewingOrder || confirmingReorder) && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setViewingOrder(null); setConfirmingReorder(null); }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            {confirmingReorder && (
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
                            )}

                            <div className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.2rem] mb-2">
                                            {confirmingReorder ? 'Confirmar Repetición de Pedido' : 'Detalles del Pedido'}
                                        </p>
                                        <h3 className="text-3xl font-black text-white leading-tight">
                                            #{(viewingOrder || confirmingReorder).id.slice(0, 8).toUpperCase()}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => { setViewingOrder(null); setConfirmingReorder(null); }}
                                        className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-[#e5242c]/10 rounded-xl text-[#e5242c]">
                                                <FaMapMarkerAlt size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Dirección de Entrega</p>
                                                <p className="text-sm text-gray-200 font-medium leading-tight">
                                                    {(viewingOrder || confirmingReorder).address || 'No especificada'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Productos solicitados</h4>
                                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {(typeof (viewingOrder || confirmingReorder).items === 'string' ? JSON.parse((viewingOrder || confirmingReorder).items) : ((viewingOrder || confirmingReorder).items || [])).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 bg-[#e5242c] text-white rounded-lg flex items-center justify-center font-black text-sm">
                                                            {item.qty || item.quantity || 1}
                                                        </div>
                                                        <span className="text-white font-bold text-sm">{item.name}</span>
                                                    </div>
                                                    <span className="text-gray-400 font-mono text-sm leading-none">L {Number(item.total || (item.price * (item.qty || item.quantity || 1))).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Total Pagado</span>
                                        <span className="text-3xl font-black text-white tracking-tight">L {Number((viewingOrder || confirmingReorder).total).toFixed(2)}</span>
                                    </div>

                                    <div className="pt-4">
                                        {confirmingReorder ? (
                                            <button
                                                onClick={() => handleConfirmReorder(confirmingReorder)}
                                                className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-600/20 active:scale-95"
                                            >
                                                <FaRedo /> Confirmar y Añadir al Carrito
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setViewingOrder(null)}
                                                className="w-full bg-white/5 hover:bg-white/10 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all border border-white/5"
                                            >
                                                Cerrar Detalles
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reorder Success Modal */}
            <AnimatePresence>
                {showReorderSuccess && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReorderSuccess(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                                    <FaCheckCircle size={40} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2 tracking-tight">¡Cargado al Carrito!</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Hemos añadido los productos de tu pedido anterior al carrito actual. ¿Qué deseas hacer ahora?
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 w-full gap-3">
                                    <button
                                        onClick={() => { setView('order'); setShowReorderSuccess(false); }}
                                        className="bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        <FaShoppingCart size={14} /> Ir al Carrito <FaArrowRight />
                                    </button>
                                    <button
                                        onClick={() => setShowReorderSuccess(false)}
                                        className="bg-white/5 text-gray-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        Seguir Navegando
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

