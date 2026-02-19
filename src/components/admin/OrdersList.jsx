import { useState } from 'react'
import { FaClock, FaUser, FaMotorcycle, FaChevronDown, FaPlus, FaMapMarkerAlt } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function OrdersList({ orders, loading, deliveryUsers, onUpdate, onTrack }) {
    const [openDropdownId, setOpenDropdownId] = useState(null)
    const [filterTab, setFilterTab] = useState('pending')
    const [timeFilter, setTimeFilter] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState(null)

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-[#111] border border-white/5 p-5 rounded-2xl flex flex-col gap-4 group hover:border-[#e5242c]/30 hover:bg-white/[0.02] transition-all cursor-pointer relative"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#e5242c]/10 flex items-center justify-center text-[#e5242c] shrink-0">
                                    <FaClock size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">
                                        {order.client_name || `Invitado #${order.id.slice(0, 4).toUpperCase()}`}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 truncate font-medium">L {Number(order.total).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
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
                                <div className="text-[8px] text-gray-600 font-bold">
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    deliveryUsers={deliveryUsers}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateStatus={updateOrderStatus}
                    onAssignDelivery={assignDelivery}
                    onDelete={deleteOrder}
                    onTrack={onTrack}
                />
            )}
        </div>
    )
}

function OrderDetailModal({ order, deliveryUsers, onClose, onUpdateStatus, onAssignDelivery, onDelete, onTrack }) {
    const [openDropdown, setOpenDropdown] = useState(false)

    return (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-all z-10"
                    >
                        <FaPlus className="rotate-45" size={20} />
                    </button>

                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 rounded-3xl bg-[#e5242c]/10 flex items-center justify-center text-[#e5242c] text-2xl">
                            <FaClock />
                        </div>
                        <div className="flex-1">
                            <p className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Detalles del Pedido</p>
                            <h2 className="text-2xl font-black text-white">{order.client_name || `Invitado #${order.id.slice(0, 4).toUpperCase()}`}</h2>
                            <p className="text-gray-500 text-xs font-medium">#{order.id.slice(0, 12)} • {new Date(order.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <DetailBox icon={<FaUser />} label="Teléfono" value={order.client_phone} />
                        <DetailBox icon={<FaMapMarkerAlt />} label="Tipo Entrega" value={order.delivery_type === 'delivery' ? '🚗 Domicilio' : '🥡 Para llevar'} />
                        <DetailBox
                            icon={<FaPlus />}
                            label="Estado"
                            value={order.status.toUpperCase()}
                            isBadge
                            badgeColor={
                                order.status === 'pending' ? 'bg-yellow-500' :
                                    order.status === 'delivered' ? 'bg-green-600' :
                                        order.status === 'cancelled' ? 'bg-red-600' :
                                            'bg-blue-600'
                            }
                        />
                        <DetailBox icon={<FaPlus />} label="Total" value={`L ${Number(order.total).toFixed(2)}`} />
                    </div>

                    {order.cancel_reason && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Motivo de Cancelación</span>
                            </div>
                            <p className="text-sm text-gray-400 font-medium italic">"{order.cancel_reason}"</p>
                        </div>
                    )}

                    <div className="space-y-4 mb-8">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Productos</h5>
                        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-[#e5242c]">{item.quantity}x</div>
                                        <span className="text-sm font-bold text-white">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-400">L {Number(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
                        {order.status === 'pending' && (
                            <button
                                onClick={() => { onUpdateStatus(order.id, 'cooking'); onClose(); }}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20"
                            >
                                👨‍🍳 Cocinar
                            </button>
                        )}
                        {order.status === 'cooking' && (
                            <button
                                onClick={() => { onUpdateStatus(order.id, 'ready'); onClose(); }}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
                            >
                                ✅ Listo
                            </button>
                        )}
                        {order.status === 'shipped' && (
                            <button
                                onClick={() => { onTrack(order); onClose(); }}
                                className="flex-1 bg-[#e5242c] text-white h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px]"
                            >
                                <FaMapMarkerAlt /> Rastrear
                            </button>
                        )}

                        {order.delivery_type === 'delivery' && !['delivered', 'cancelled'].includes(order.status) && (
                            <div className="relative flex-1">
                                <button
                                    onClick={() => setOpenDropdown(!openDropdown)}
                                    className="w-full h-14 bg-white/5 border border-white/10 hover:border-[#e5242c]/40 rounded-2xl px-5 text-xs text-left text-white outline-none transition-all flex items-center justify-between font-bold"
                                >
                                    <div className="flex items-center gap-3">
                                        <FaMotorcycle size={14} className="text-[#e5242c]" />
                                        <span>Asignar Repartidor</span>
                                    </div>
                                    <FaChevronDown size={10} className={`text-gray-500 transition-transform ${openDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {openDropdown && (
                                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#151515] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                                        <div className="max-h-52 overflow-y-auto">
                                            {deliveryUsers.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => { onAssignDelivery(order.id, u.id); setOpenDropdown(false); onClose(); }}
                                                    className="px-5 py-4 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between"
                                                >
                                                    <span>{u.first_name}</span>
                                                    <span className="text-[10px] opacity-40 font-mono">{u.delivery_id_card}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => { onDelete(order.id); onClose(); }}
                            className="w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-red-500/20 shrink-0"
                        >
                            <FaPlus className="rotate-45" size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailBox({ icon, label, value, isBadge, badgeColor }) {
    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
                <span className="text-[10px]">{icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
            {isBadge ? (
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black text-white mt-1 ${badgeColor}`}>
                    {value}
                </span>
            ) : (
                <p className="text-white font-bold text-sm truncate">{value}</p>
            )}
        </div>
    )
}
