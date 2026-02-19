export default function Dashboard({ orders, reviews, products }) {
    const today = new Date().toISOString().split('T')[0]
    const todayOrders = orders.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled')
    const totalToday = todayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)

    const deliveredOrders = orders.filter(o => o.status === 'delivered')
    const totalHistorical = deliveredOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)

    // Popular product estimation
    const itemCounts = {}
    deliveredOrders.forEach(o => {
        (o.items || []).forEach(item => {
            const name = item.name || item.id
            itemCounts[name] = (itemCounts[name] || 0) + 1
        })
    })
    const sortedProducts = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])
    const topProduct = sortedProducts[0]?.[0] || 'N/A'

    return (
        <div className="space-y-10">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Ventas de Hoy', value: `L ${totalToday.toFixed(2)}`, sub: `${todayOrders.length} pedidos hoy`, icon: '💰', color: 'bg-green-500/10 text-green-500' },
                    { label: 'Pedidos Pendientes', value: orders.filter(o => o.status === 'pending').length, sub: 'Requieren atención', icon: '🔔', color: 'bg-yellow-500/10 text-yellow-500' },
                    { label: 'Producto Estrella', value: topProduct, sub: 'Más vendido histórico', icon: '🍣', color: 'bg-[#e5242c]/10 text-[#e5242c]' },
                    { label: 'Calificación Prom.', value: (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1), sub: `${reviews.length} reseñas totales`, icon: '⭐', color: 'bg-blue-500/10 text-blue-500' }
                ].map((card, i) => (
                    <div key={i} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{card.label}</p>
                            <h3 className="text-3xl font-black mb-1">{card.value}</h3>
                            <p className="text-xs text-gray-500 font-bold">{card.sub}</p>
                        </div>
                        <div className={`absolute top-4 right-6 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${card.color} rotate-6 group-hover:rotate-0 transition-transform`}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Historical Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <span className="text-blue-500">📊</span> Resumen General
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                            <span className="text-gray-400 font-bold">Ventas Históricas (Excl. Cancelados)</span>
                            <span className="text-white font-black">L {totalHistorical.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                            <span className="text-gray-400 font-bold">Total de Clientes Registrados</span>
                            <span className="text-white font-black">{products.length} platos en menú</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <span className="text-[#e5242c]">🥢</span> Ranking de Productos
                    </h3>
                    <div className="space-y-4">
                        {sortedProducts.slice(0, 3).map(([name, count], i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm font-bold flex items-center gap-3">
                                    <span className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center text-[10px]">{i + 1}</span>
                                    {name}
                                </span>
                                <span className="text-white font-black text-xs uppercase tracking-widest">{count} vendidos</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
