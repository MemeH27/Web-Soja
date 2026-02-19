import { useState } from 'react'
import { FaClock, FaUser, FaMotorcycle, FaChevronDown, FaPlus, FaMapMarkerAlt } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function OrdersList({ orders, loading, deliveryUsers, onUpdate, onTrack }) {
    const [openDropdownId, setOpenDropdownId] = useState(null)
    const [filterTab, setFilterTab] = useState('pending')
    const [timeFilter, setTimeFilter] = useState('all')

    if (loading) return <div className="p-8 text-gray-400">Cargando pedidos...</div>

    const updateOrderStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) alert(error.message)
        else onUpdate()
    }

    const assignDelivery = async (orderId, deliveryId) => {
        const { error } = await supabase
            .from('orders')
            .update({ delivery_id: deliveryId, status: 'prepared' })
            .eq('id', orderId)

        if (error) alert(error.message)
        else onUpdate()
    }

    const deleteOrder = async (orderId) => {
        if (window.confirm('¿Estás seguro de eliminar este pedido permanentemente?')) {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId)
            if (error) alert(error.message)
            else onUpdate()
        }
    }

    const filteredOrders = orders.filter(order => {
        // Tab filtering
        let matchesTab = true
        if (filterTab === 'pending') matchesTab = order.status === 'pending'
        else if (filterTab === 'in_progress') matchesTab = ['cooking', 'ready', 'prepared', 'shipped'].includes(order.status)
        else if (filterTab === 'history') matchesTab = ['delivered', 'cancelled'].includes(order.status)

        if (!matchesTab) return false

        // Time filtering
        if (timeFilter === 'all') return true

        const now = new Date()
        const orderDate = new Date(order.created_at)

        if (timeFilter === 'day') {
            return orderDate.toDateString() === now.toDateString()
        }
        if (timeFilter === 'week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return orderDate >= lastWeek
        }
        if (timeFilter === 'month') {
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return orderDate >= lastMonth
        }

        return true
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                <div className="flex p-1.5 bg-white/5 rounded-2xl w-fit gap-2 border border-white/10">
                    {[
                        { id: 'pending', label: 'Pendientes', icon: '🔔', count: orders.filter(o => o.status === 'pending').length },
                        { id: 'in_progress', label: 'En Curso', icon: '🛵', count: orders.filter(o => ['cooking', 'ready', 'prepared', 'shipped'].includes(o.status)).length },
                        { id: 'history', label: 'Historial', icon: '📋', count: orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest
                                ${filterTab === tab.id
                                    ? 'bg-[#e5242c] text-white shadow-lg shadow-[#e5242c]/20'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <span>{tab.icon} {tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${filterTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 gap-1 overflow-x-auto max-w-full">
                    {[
                        { id: 'all', label: 'Todo' },
                        { id: 'day', label: 'Hoy' },
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mes' }
                    ].map(tf => (
                        <button
                            key={tf.id}
                            onClick={() => setTimeFilter(tf.id)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${timeFilter === tf.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-gray-500 italic p-12 bg-[#111] rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center gap-4">
                    <div className="text-4xl opacity-20">📭</div>
                    <p>No hay pedidos en esta categoría.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="bg-[#111] border border-white/5 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col group hover:border-[#e5242c]/20 transition-all shadow-xl gap-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] shrink-0">
                                        <FaClock size={20} className="md:size-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-bold text-lg md:text-xl text-white">
                                                {order.client_name || `Invitado #${order.id.slice(0, 4).toUpperCase()}`}
                                            </h4>
                                            <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                                    order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {order.status === 'pending' ? 'Pendiente' :
                                                    order.status === 'cooking' ? 'Cocinando' :
                                                        order.status === 'ready' || order.status === 'prepared' ? 'Preparado' :
                                                            order.status === 'shipped' ? 'En Camino' :
                                                                order.status === 'cancelled' ? 'Cancelado' : 'Entregado'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-500 text-xs text-left">
                                            <span className="flex items-center gap-2 font-medium">
                                                <FaUser size={10} className="text-[#e5242c]/50" /> {order.client_phone}
                                            </span>
                                            <span className="hidden sm:inline opacity-30">•</span>
                                            <span className="opacity-60">{new Date(order.created_at).toLocaleString()}</span>
                                            <span className="bg-white/5 text-[8px] text-gray-600 px-2 py-0.5 rounded uppercase font-black tracking-widest w-fit">#{order.id.slice(0, 8)}</span>
                                        </div>
                                        {order.status === 'cancelled' && order.cancel_reason && (
                                            <div className="mt-3 bg-red-500/5 border border-red-500/10 p-3 rounded-xl flex items-center gap-3">
                                                <span className="text-red-500 text-[10px] font-black uppercase tracking-widest shrink-0">Motivo:</span>
                                                <p className="text-xs text-gray-400 font-medium italic">"{order.cancel_reason}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between md:flex-col items-center md:items-end gap-1 md:gap-0 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                    <div className="font-black text-2xl md:text-3xl text-white tracking-tight">L {Number(order.total).toFixed(2)}</div>
                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-black">{order.delivery_type === 'delivery' ? '🚗 Domicilio' : '🥡 Para llevar'}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 pt-4 border-t border-white/5">
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'cooking')}
                                        className="flex-1 sm:flex-none h-12 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-2xl flex items-center justify-center gap-2 transition-all border border-orange-500/20 font-bold text-xs"
                                    >
                                        👨‍🍳 Cocinar
                                    </button>
                                )}
                                {order.status === 'cooking' && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'ready')}
                                        className="flex-1 sm:flex-none h-12 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-2xl flex items-center justify-center gap-2 transition-all border border-blue-500/20 font-bold text-xs"
                                    >
                                        ✅ Listo
                                    </button>
                                )}
                                {order.status === 'shipped' && (
                                    <button
                                        onClick={() => onTrack(order)}
                                        className="flex-1 sm:flex-none bg-[#e5242c]/10 text-[#e5242c] hover:bg-[#e5242c] hover:text-white h-12 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] border border-[#e5242c]/20"
                                    >
                                        <FaMapMarkerAlt size={14} /> Rastrear
                                    </button>
                                )}

                                {order.delivery_type === 'delivery' && (order.status === 'ready' || order.status === 'pending' || order.status === 'cooking' || order.status === 'shipped') && (
                                    <div className="relative flex-1 md:flex-none min-w-[200px]">
                                        <button
                                            onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                                            className="w-full h-12 bg-white/5 border border-white/10 hover:border-[#e5242c]/40 rounded-2xl px-5 text-xs text-left text-white outline-none transition-all flex items-center justify-between font-bold"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FaMotorcycle size={14} className="text-[#e5242c]" />
                                                <span className="truncate max-w-[120px]">
                                                    {order.delivery_id
                                                        ? deliveryUsers.find(u => u.id === order.delivery_id)
                                                            ? deliveryUsers.find(u => u.id === order.delivery_id).first_name
                                                            : 'Asignado'
                                                        : 'Asignar Repartidor'}
                                                </span>
                                            </div>
                                            <FaChevronDown size={10} className={`text-gray-500 transition-transform ${openDropdownId === order.id ? 'rotate-180' : ''}`} />
                                        </button>

                                        {openDropdownId === order.id && (
                                            <>
                                                <div className="fixed inset-0 z-[60]" onClick={() => setOpenDropdownId(null)} />
                                                <div className="absolute top-full mt-2 left-0 right-0 bg-[#151515] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                    <div
                                                        onClick={() => { assignDelivery(order.id, null); setOpenDropdownId(null); }}
                                                        className="px-5 py-3 text-[10px] font-black uppercase text-gray-500 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors"
                                                    >
                                                        Sin Asignar
                                                    </div>
                                                    <div className="max-h-52 overflow-y-auto">
                                                        {deliveryUsers.map(u => (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => {
                                                                    assignDelivery(order.id, u.id)
                                                                    setOpenDropdownId(null)
                                                                }}
                                                                className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0
                                                                    ${order.delivery_id === u.id ? 'bg-[#e5242c] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                                                `}
                                                            >
                                                                <span>{u.first_name}</span>
                                                                <span className="text-[10px] opacity-60 font-mono">{u.delivery_id_card}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="h-12 w-12 sm:ml-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-red-500/20"
                                    title="Eliminar Pedido"
                                >
                                    <FaPlus className="rotate-45" size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
