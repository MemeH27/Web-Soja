import { useState } from 'react'
import { FaClock, FaUser, FaMotorcycle, FaChevronDown, FaPlus, FaMapMarkerAlt } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function OrdersList({ orders, loading, deliveryUsers, onUpdate, onTrack }) {
    const [openDropdownId, setOpenDropdownId] = useState(null)
    const [filterTab, setFilterTab] = useState('pending')

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
        if (filterTab === 'pending') return order.status === 'pending'
        if (filterTab === 'in_progress') return ['cooking', 'ready', 'prepared', 'shipped'].includes(order.status)
        if (filterTab === 'history') return ['delivered', 'cancelled'].includes(order.status)
        return true
    })

    return (
        <div className="space-y-6">
            <div className="flex p-1.5 bg-white/5 rounded-2xl w-fit mb-8 gap-2 border border-white/10">
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

            {filteredOrders.length === 0 ? (
                <div className="text-gray-500 italic p-12 bg-[#111] rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center gap-4">
                    <div className="text-4xl opacity-20">📭</div>
                    <p>No hay pedidos en esta categoría.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between group hover:border-[#e5242c]/20 transition-all shadow-xl gap-6">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-14 h-14 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] rotate-3 group-hover:rotate-0 transition-transform">
                                    <FaClock size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h4 className="font-bold text-xl text-white">
                                            {order.client_name || `Invitado #${order.id.slice(0, 4).toUpperCase()}`}
                                        </h4>
                                        {!order.user_id && <span className="bg-white/5 text-[8px] text-gray-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">Anónimo</span>}
                                        <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                            order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : // Fixed typo from earlier view (it was text-red-500 but consistency is good)
                                                    'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {order.status === 'pending' ? 'Pendiente' :
                                                order.status === 'cooking' ? 'Cocinando' :
                                                    order.status === 'ready' || order.status === 'prepared' ? 'Preparado' :
                                                        order.status === 'shipped' ? 'En Camino' :
                                                            order.status === 'cancelled' ? 'Cancelado' : 'Entregado'}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm flex items-center gap-4">
                                        <span className="flex items-center gap-2"><FaUser size={12} className="text-[#e5242c]" /> {order.client_phone}</span>
                                        <span className="text-gray-600">•</span>
                                        <span>{new Date(order.created_at).toLocaleString()}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                                <div className="text-center md:text-right w-full md:w-auto">
                                    <div className="font-black text-2xl text-white tracking-tight">L {Number(order.total).toFixed(2)}</div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-black">{order.delivery_type === 'delivery' ? 'A Domicilio' : 'Para llevar'}</p>
                                </div>

                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'cooking')}
                                        className="w-12 h-12 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-orange-500/20 shadow-lg"
                                        title="Pasar a Cocina"
                                    >
                                        👨‍🍳
                                    </button>
                                )}
                                {order.status === 'cooking' && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'ready')}
                                        className="w-12 h-12 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-blue-500/20 shadow-lg"
                                        title="Marcar como Listo"
                                    >
                                        ✅
                                    </button>
                                )}
                                {order.status === 'shipped' && (
                                    <button
                                        onClick={() => onTrack(order)}
                                        className="bg-[#e5242c] text-white px-5 py-3 rounded-2xl flex items-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#e5242c]/20 hover:scale-105 active:scale-95"
                                    >
                                        <FaMapMarkerAlt size={14} />
                                        <span>Rastrear pedido</span>
                                    </button>
                                )}
                                {order.delivery_type === 'delivery' && (order.status === 'ready' || order.status === 'pending' || order.status === 'cooking' || order.status === 'shipped') && (
                                    <div className="relative flex-1 md:flex-none">
                                        <button
                                            onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                                            className="w-full md:w-64 bg-black border-2 border-[#e5242c]/30 hover:border-[#e5242c] rounded-2xl pl-12 pr-10 py-3 text-xs text-left text-white outline-none focus:ring-4 focus:ring-[#e5242c]/10 transition-all cursor-pointer font-black uppercase tracking-wider shadow-lg shadow-[#e5242c]/5 flex items-center justify-between"
                                        >
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e5242c]">
                                                <FaMotorcycle size={16} />
                                            </div>
                                            <span className="truncate">
                                                {order.delivery_id
                                                    ? deliveryUsers.find(u => u.id === order.delivery_id)
                                                        ? `${deliveryUsers.find(u => u.id === order.delivery_id).first_name} (${deliveryUsers.find(u => u.id === order.delivery_id).delivery_id_card})`
                                                        : 'Asignado'
                                                    : 'Asignar Repartidor'}
                                            </span>
                                            <FaChevronDown size={12} className={`text-[#e5242c] transition-transform ${openDropdownId === order.id ? 'rotate-180' : ''}`} />
                                        </button>

                                        {openDropdownId === order.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-[60]"
                                                    onClick={() => setOpenDropdownId(null)}
                                                />
                                                <div className="absolute top-full mt-2 left-0 right-0 bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-visible shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[70] animate-in fade-in slide-in-from-top-2 duration-200 min-w-[200px]">
                                                    <div
                                                        onClick={() => { assignDelivery(order.id, null); setOpenDropdownId(null); }}
                                                        className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 hover:bg-white/5 cursor-pointer border-b border-white/10 transition-colors first:rounded-t-2xl"
                                                    >
                                                        Sin Asignar
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                        {deliveryUsers.map(u => (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => {
                                                                    assignDelivery(order.id, u.id)
                                                                    setOpenDropdownId(null)
                                                                }}
                                                                className={`px-6 py-4 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group/item border-b border-white/5 last:border-0
                                                                        ${order.delivery_id === u.id ? 'bg-[#e5242c] text-white' : 'text-gray-300 hover:bg-[#e5242c]/10 hover:text-white'}
                                                                    `}
                                                            >
                                                                <span>{u.first_name} {u.last_name}</span>
                                                                <span className={`text-[10px] font-black tracking-widest ${order.delivery_id === u.id ? 'text-white/60' : 'text-[#e5242c]'}`}>
                                                                    {u.delivery_id_card}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {deliveryUsers.length === 0 && (
                                                        <div className="px-6 py-4 text-xs text-gray-500 italic">No hay repartidores activos</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-red-500/20 group/del shadow-lg"
                                    title="Eliminar Pedido"
                                >
                                    <FaPlus className="rotate-45" size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
