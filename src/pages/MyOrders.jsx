import { useState, useEffect } from 'react'
import { FaChevronLeft, FaClock, FaBox, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaFilter, FaCalendarAlt, FaRedo, FaShoppingCart, FaArrowRight } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function MyOrders({ onBack, setCart, setView }) {
    const { user, profile } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, delivered, cancelled
    const [selectedMonth, setSelectedMonth] = useState('all')
    const [showReorderModal, setShowReorderModal] = useState(false)

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

    const handleReorder = (order) => {
        if (!setCart) return

        const newCart = {}
        order.items.forEach(item => {
            newCart[item.id] = (newCart[item.id] || 0) + item.qty
        })

        setCart(newCart)
        setShowReorderModal(true)
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
                    <div className="grid gap-6">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between group hover:border-[#e5242c]/20 transition-all shadow-xl gap-6">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                        order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                            'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        {order.status === 'delivered' ? <FaCheckCircle size={24} /> :
                                            order.status === 'cancelled' ? <FaTimesCircle size={24} /> :
                                                <FaClock size={24} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-xs font-black text-gray-500 uppercase tracking-[0.15rem]">PEDIDO #{order.id.slice(0, 8).toUpperCase()}</p>
                                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {order.status === 'delivered' ? 'Entregado' :
                                                    order.status === 'cancelled' ? 'Cancelado' : 'En Proceso'}
                                            </span>
                                        </div>
                                        <p className="text-white font-bold flex items-center gap-3">
                                            {order.items?.length || 0} productos
                                            <span className="text-gray-700">•</span>
                                            <span className="text-gray-400 text-sm font-normal">{new Date(order.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total</p>
                                        <p className="text-xl font-black text-white tracking-tight">L {Number(order.total).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleReorder(order)}
                                            className="flex-1 sm:flex-none h-12 bg-green-500 hover:bg-green-600 text-white px-6 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-green-900/20"
                                        >
                                            <FaRedo size={14} />
                                            <span className="text-sm">Pedir de nuevo</span>
                                        </button>
                                        <button
                                            onClick={() => {/* Ver detalle */ }}
                                            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-white/5 active:scale-95"
                                            title="Ver Detalles"
                                        >
                                            <FaBox size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reorder Success Modal */}
            <AnimatePresence>
                {showReorderModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReorderModal(false)}
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
                                        onClick={() => setView('cart')}
                                        className="bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        <FaShoppingCart size={14} /> Ir a Pagar <FaArrowRight />
                                    </button>
                                    <button
                                        onClick={() => setShowReorderModal(false)}
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
