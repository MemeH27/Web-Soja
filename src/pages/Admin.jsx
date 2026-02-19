import { useState, useEffect } from 'react'
import { FaBox, FaStar, FaSignOutAlt, FaPlus, FaTrash, FaEdit, FaTimes, FaUser, FaClock, FaCheckCircle, FaMotorcycle, FaChevronDown, FaBars, FaMapMarkerAlt, FaChartLine, FaCheck } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useMenu } from '../hooks/useMenu'
import { useReviews } from '../hooks/useReviews'
import { useAuth } from '../hooks/useAuth.jsx'
import PushNotificationToggle from '../components/PushNotificationToggle'
import OrderTracking from '../components/OrderTracking'

export default function Admin({ setView }) {
    const { user, profile, role, signOut, loading: authLoading } = useAuth()
    const activeRole = role || profile?.role

    const handleLogout = async () => {
        await signOut()
        setView('home')
    }

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Verificando credenciales...</p>
            </div>
        )
    }

    // Security check: If not admin, do not show the panel
    if (activeRole !== 'admin') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-[#e5242c]/10 p-8 rounded-[2.5rem] border border-[#e5242c]/20 max-w-md">
                    <h2 className="text-3xl font-serif font-bold text-[#e5242c] mb-4">Acceso Denegado</h2>
                    <p className="text-gray-400 mb-8">No tienes permisos para acceder a esta sección. Por favor, inicia sesión con una cuenta administrativa.</p>
                    <button
                        onClick={() => setView('home')}
                        className="bg-[#e5242c] text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        )
    }
    const [activeTab, setActiveTab] = useState('dashboard')
    const [trackingOrder, setTrackingOrder] = useState(null)
    const { menu, loading: menuLoading, setMenu } = useMenu({ adminMode: true })
    const { reviews, loading: reviewsLoading, setReviews } = useReviews()
    const [usersList, setUsersList] = useState([])
    const [ordersList, setOrdersList] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [newOrderBadge, setNewOrderBadge] = useState(0)

    // Delivery system state
    const [deliveryUsers, setDeliveryUsers] = useState([])
    const [loadingDelivery, setLoadingDelivery] = useState(false)
    const [showUserRoleModal, setShowUserRoleModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        // Close sidebar on tab change on mobile
        setIsSidebarOpen(false)
        // Clear badge when switching to orders tab
        if (activeTab === 'orders') setNewOrderBadge(0)
    }, [activeTab])

    // Real-time subscription: auto-prepend new orders without refreshing
    useEffect(() => {
        const sub = supabase
            .channel('admin_orders_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders'
            }, (payload) => {
                console.log('🔔 Nuevo pedido en tiempo real:', payload.new)
                setOrdersList(prev => [payload.new, ...prev])
                if (activeTab !== 'orders') {
                    setNewOrderBadge(prev => prev + 1)
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders'
            }, (payload) => {
                setOrdersList(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
            })
            .subscribe()

        return () => { supabase.removeChannel(sub) }
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
        if (activeTab === 'orders') {
            fetchOrders()
            fetchDeliveryUsers()
        }
        if (activeTab === 'delivery') fetchDeliveryUsers()
    }, [activeTab])

    const fetchDeliveryUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'delivery')
        if (data) setDeliveryUsers(data)
    }

    const fetchUsers = async () => {
        setLoadingUsers(true)
        console.log('🔍 Intentando cargar usuarios...')
        const { data, error } = await supabase
            .from('profiles')
            .select('*')

        if (data) {
            console.log('✅ Usuarios recibidos:', data.length, data)
            // Filtramos para que NO aparezcan los repartidores en esta lista
            setUsersList(data.filter(u => u.role !== 'delivery'))
        }
        if (error) {
            console.error('❌ Error cargando usuarios:', {
                message: error.message,
                hint: error.hint,
                details: error.details,
                code: error.code
            })
            alert('Error al cargar usuarios: ' + error.message)
        }
        setLoadingUsers(false)
    }

    const fetchOrders = async () => {
        setLoadingOrders(true)
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        if (data) setOrdersList(data)
        setLoadingOrders(false)
    }

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('¿Eliminar este producto?')) return
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) alert(error.message)
        else setMenu(menu.filter(p => p.id !== id))
    }

    const handleDeleteReview = async (id) => {
        if (!window.confirm('¿Eliminar esta reseña?')) return
        const { error } = await supabase.from('reviews').delete().eq('id', id)
        if (error) alert(error.message)
        else setReviews(reviews.filter(r => r.id !== id))
    }

    const handleToggleStock = async (product) => {
        const newAvailable = !product.available
        const { error } = await supabase
            .from('products')
            .update({ available: newAvailable })
            .eq('id', product.id)
        if (!error) {
            setMenu(menu.map(p => p.id === product.id ? { ...p, available: newAvailable } : p))
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row relative">
            {/* Mobile Header */}
            <header className="md:hidden bg-[#111] border-b border-white/10 p-4 flex justify-between items-center sticky top-0 z-50">
                <img src="/img/logo/logo_blanco.png" alt="SOJA Logo" className="h-8" />
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 bg-white/5 rounded-lg text-gray-400"
                >
                    {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                </button>
            </header>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-64 bg-[#111] border-r border-white/10 flex flex-col p-6 z-50 transition-transform duration-300
                md:sticky md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="mb-12 hidden md:block">
                    <img src="/img/logo/logo_blanco.png" alt="SOJA Logo" className="h-10 mb-2" />
                    <p className="text-gray-500 text-xs uppercase tracking-widest mt-1 font-black">Admin Panel</p>
                </div>

                <nav className="flex-1 space-y-2 mt-4 md:mt-0">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaChartLine /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaBox /> Productos
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaBox /> Pedidos
                        {newOrderBadge > 0 && (
                            <span className="ml-auto bg-[#e5242c] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                {newOrderBadge}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaUser /> Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('delivery')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'delivery' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaClock /> Repartidores
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reviews' ? 'bg-[#e5242c] text-white font-bold' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaStar /> Reseñas
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="mt-auto flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white transition-colors border-t border-white/5 pt-6"
                >
                    <FaSignOutAlt /> Cerrar Sesión
                </button>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold">
                        {activeTab === 'dashboard' ? 'Dashboard de Negocio' :
                            activeTab === 'products' ? 'Gestionar Productos' :
                                activeTab === 'orders' ? 'Gestionar Pedidos' :
                                    activeTab === 'users' ? 'Gestionar Usuarios' :
                                        activeTab === 'delivery' ? 'Gestionar Repartidores' :
                                            'Gestionar Reseñas'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <PushNotificationToggle user={user} role="admin" compact />
                        <button
                            onClick={handleLogout}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl border border-white/5 transition-all flex items-center gap-2 group text-sm font-bold"
                        >
                            <FaSignOutAlt className="group-hover:-translate-x-1 transition-transform" />
                            <span className="hidden sm:inline">Cerrar Sesión</span>
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab === 'users') fetchUsers()
                                if (activeTab === 'orders') fetchOrders()
                                if (activeTab === 'products') window.location.reload()
                            }}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl border border-white/5 transition-all text-sm font-bold flex items-center gap-2"
                            title="Refrescar datos"
                        >
                            <FaClock size={14} className="animate-pulse" />
                            Refrescar
                        </button>
                        {activeTab === 'products' && (
                            <button
                                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                className="bg-[#e5242c] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform text-sm shadow-lg shadow-[#e5242c]/20"
                            >
                                <FaPlus /> <span className="hidden sm:inline">Añadir Producto</span>
                            </button>
                        )}
                    </div>
                </header>

                {activeTab === 'dashboard' ? (
                    <Dashboard orders={ordersList} reviews={reviews} products={menu} />
                ) : activeTab === 'products' ? (
                    <ProductsList products={menu} loading={menuLoading} onDelete={handleDeleteProduct} onEdit={(p) => { setEditingProduct(p); setShowProductModal(true); }} onToggleStock={handleToggleStock} />
                ) : activeTab === 'orders' ? (
                    <OrdersList
                        orders={ordersList}
                        loading={loadingOrders}
                        deliveryUsers={deliveryUsers}
                        onUpdate={fetchOrders}
                        onTrack={(order) => setTrackingOrder(order)}
                    />
                ) : activeTab === 'users' ? (
                    <UsersList users={usersList} loading={loadingUsers} onUpdate={fetchUsers} />
                ) : activeTab === 'delivery' ? (
                    <DeliveryList users={deliveryUsers} loading={loadingDelivery} onUpdate={fetchDeliveryUsers} />
                ) : (
                    <ReviewsList reviews={reviews} loading={reviewsLoading} onDelete={handleDeleteReview} onUpdate={() => window.location.reload()} />
                )}
            </main>

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal
                    onClose={() => setShowProductModal(false)}
                    product={editingProduct}
                    onSave={() => {
                        // Better to re-fetch or update state locally
                        window.location.reload();
                    }}
                />
            )}

            {/* Order Tracking Modal */}
            {trackingOrder && (
                <OrderTracking
                    order={trackingOrder}
                    onBack={() => setTrackingOrder(null)}
                    isAdmin={true}
                />
            )}
        </div>
    )
}

function ProductsList({ products, loading, onDelete, onEdit, onToggleStock }) {
    if (loading) return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-64 bg-white/5 rounded-3xl" />
            ))}
        </div>
    )

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map(product => (
                <div key={product.id} className={`bg-[#111] border rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#e5242c]/5 ${product.available === false ? 'border-red-500/30 opacity-60' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="relative aspect-square overflow-hidden bg-black">
                        <img
                            src={product.image || '/img/placeholder-dish.png'}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => { e.target.src = '/img/logo/logo_blanco.png'; e.target.className = 'w-full h-full object-contain p-8 opacity-20'; }}
                        />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleStock(product); }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${product.available === false ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                title={product.available === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                            >
                                <FaCheckCircle size={14} className={product.available === false ? 'opacity-40' : 'text-green-400'} />
                            </button>
                        </div>
                        {product.available === false && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                                <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Agotado</span>
                            </div>
                        )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#e5242c]/60 mb-1 block">{product.category === 'food' ? 'Platillo' : 'Bebida'}</span>
                            <h4 className="font-bold text-base line-clamp-2 leading-tight group-hover:text-[#e5242c] transition-colors">{product.name}</h4>
                        </div>
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="font-black text-lg text-white">L {Number(product.price).toFixed(0)}</div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onEdit(product)}
                                    className="w-8 h-8 bg-white/5 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg flex items-center justify-center transition-all active:scale-95 border border-white/5"
                                >
                                    <FaEdit size={12} />
                                </button>
                                <button
                                    onClick={() => onDelete(product.id)}
                                    className="w-8 h-8 bg-white/5 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center transition-all active:scale-95 border border-white/5"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ReviewsList({ reviews, loading, onDelete, onUpdate }) {
    const [moderationTab, setModerationTab] = useState('pending')
    if (loading) return <div>Cargando reseñas...</div>

    const handlePublish = async (id) => {
        const { error } = await supabase.from('reviews').update({ published: true }).eq('id', id)
        if (error) alert(error.message)
        else onUpdate()
    }

    const filteredReviews = reviews.filter(r => moderationTab === 'pending' ? !r.published : r.published)

    return (
        <div className="space-y-6">
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                <button
                    onClick={() => setModerationTab('pending')}
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${moderationTab === 'pending' ? 'bg-[#e5242c] text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    Pendientes ({reviews.filter(r => !r.published).length})
                </button>
                <button
                    onClick={() => setModerationTab('published')}
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${moderationTab === 'published' ? 'bg-[#e5242c] text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    Publicadas ({reviews.filter(r => r.published).length})
                </button>
            </div>

            {filteredReviews.length === 0 ? (
                <div className="text-gray-500 italic p-12 bg-[#111] rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center gap-4">
                    <div className="text-4xl opacity-20">💬</div>
                    <p>No hay reseñas {moderationTab === 'pending' ? 'pendientes' : 'publicadas'}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReviews.map(review => (
                        <div key={review.id} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] relative group hover:border-[#e5242c]/30 transition-all flex flex-col">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#e5242c]/5 via-transparent to-transparent rounded-bl-full pointer-events-none" />
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-bold text-lg text-white mb-1 group-hover:text-[#e5242c] transition-colors">{review.author}</h4>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{review.meta || 'Cliente SOJA'}</p>
                                </div>
                                <div className="flex text-yellow-500 bg-yellow-500/5 px-2 py-1 rounded-lg border border-yellow-500/10">
                                    {[...Array(review.rating)].map((_, i) => <FaStar key={i} size={10} />)}
                                </div>
                            </div>
                            <div className="relative mb-6 flex-1">
                                <span className="absolute -left-2 -top-2 text-4xl text-white/5 select-none font-serif">"</span>
                                <p className="text-gray-300 text-sm leading-relaxed italic pr-4 pl-2 h-[4.5rem] line-clamp-3">
                                    {review.content}
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-auto">
                                {!review.published && (
                                    <button
                                        onClick={() => handlePublish(review.id)}
                                        className="h-10 bg-green-500 text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-900/20"
                                    >
                                        <FaCheck size={12} /> Publicar
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(review.id)}
                                    className="h-10 bg-white/5 hover:bg-red-500/10 text-red-500 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border border-white/5"
                                >
                                    <FaTrash size={12} /> {review.published ? 'Eliminar' : 'Rechazar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function Dashboard({ orders, reviews, products }) {
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

function ProductModal({ onClose, product, onSave }) {
    const [formData, setFormData] = useState(product || { id: '', name: '', price: '', category: 'food', image: '', available: true })
    const [uploading, setUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState(product?.image || '')

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            let { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('products')
                .getPublicUrl(filePath)

            setFormData({ ...formData, image: data.publicUrl })
            setImagePreview(data.publicUrl)
        } catch (error) {
            alert('Error subiendo imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const { error } = await supabase.from('products').upsert(formData)
        if (error) alert(error.message)
        else {
            onSave()
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl relative animate-in fade-in zoom-in duration-300 shadow-2xl">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors bg-white/5 w-10 h-10 rounded-full flex items-center justify-center">
                    <FaTimes size={20} />
                </button>
                <h3 className="text-3xl font-black mb-8 tracking-tight">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 group">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                                    <FaBox size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</p>
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer gap-2">
                                <div className="w-12 h-12 bg-[#e5242c] rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <FaPlus />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Subir Foto</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e5242c]">Subiendo...</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">URL DIRECTA (Opcional)</label>
                            <input
                                value={formData.image}
                                onChange={e => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); }}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors text-xs font-medium"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">NOMBRE DEL PRODUCTO</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors font-bold"
                                    placeholder="Nombre"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID ÚNICO</label>
                                <input
                                    disabled={!!product}
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors disabled:opacity-50 text-xs tracking-wider"
                                    placeholder="ej: sushi-especial"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">PRECIO (L)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors font-black text-lg"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">CATEGORÍA</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors font-bold text-sm"
                                >
                                    <option value="food">🍱 Comida</option>
                                    <option value="drink">🥤 Bebida</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button className="w-full bg-[#e5242c] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-[#c41e25] transition-all shadow-xl shadow-[#e5242c]/20 active:scale-95 flex items-center justify-center gap-3">
                                {product ? <><FaEdit /> Guardar Cambios</> : <><FaPlus /> Crear Producto</>}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

function OrdersList({ orders, loading, deliveryUsers, onUpdate, onTrack }) {
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
            {/* Sub-tabs para Pedidos */}
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
                                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
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

function UsersList({ users, loading, onUpdate }) {
    const [openDropdown, setOpenDropdown] = useState(null)

    if (loading) return <div className="p-8 text-gray-400">Cargando usuarios...</div>
    if (users.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay usuarios registrados en el sistema.</div>

    const roleLabels = { user: 'Cliente Estándar', delivery: 'Repartidor', admin: 'Administrador' }
    const roleColors = { user: 'text-gray-400', delivery: 'text-blue-400', admin: 'text-[#e5242c]' }

    const handleRoleChange = async (userId, newRole, userEmail) => {
        setOpenDropdown(null)
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
        if (error) {
            console.error('❌ Error actualizando rol:', error)
            alert('Error de base de datos: ' + error.message)
        } else {
            console.log('✅ Rol actualizado con éxito para:', userEmail)
            onUpdate()
        }
    }

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`¿Eliminar al usuario ${userName}? Esta acción no se puede deshacer.`)) return
        const { error } = await supabase.from('profiles').delete().eq('id', userId)
        if (error) alert('Error al eliminar: ' + error.message)
        else onUpdate()
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => {
                const isAdmin = user.role === 'admin'
                return (
                    <div key={user.id} className={`bg-[#111] border p-6 rounded-[2.5rem] flex flex-col gap-5 transition-all group relative overflow-hidden ${isAdmin ? 'border-[#e5242c]/30' : 'border-white/5 hover:border-white/20'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#e5242c]/5 to-transparent rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110" />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform ${isAdmin ? 'bg-[#e5242c]/20 text-[#e5242c]' : 'bg-white/5 text-gray-400 font-black'}`}>
                                {user.first_name?.[0] || <FaUser />}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-white leading-tight">
                                    {user.first_name || 'Sin Nombre'} {user.last_name || ''}
                                </h4>
                                <div className="flex gap-2 mt-2">
                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${isAdmin ? 'bg-[#e5242c] text-white' : user.role === 'delivery' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                                        {user.role === 'admin' ? 'SYSTEM ADMIN' : user.role === 'delivery' ? 'DRIVER' : 'USER'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-4 relative z-10">
                            <div className="space-y-2">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest pl-1">Información de Contacto</p>
                                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-gray-300 text-sm font-medium flex items-center gap-3">
                                        <FaClock size={12} className="text-[#e5242c]" /> {user.phone || 'Sin Teléfono'}
                                    </p>
                                    <p className="text-gray-300 text-[11px] font-medium flex items-center gap-3 truncate">
                                        <span className="text-[#e5242c]">📧</span> {user.email}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[#e5242c]/5 border border-[#e5242c]/10 rounded-2xl px-5 py-4">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.2em]">Permisos de Cuenta</span>
                                    <span className="text-[#e5242c]">🔒</span>
                                </div>
                                <p className="text-white text-xs font-bold leading-relaxed opacity-60 italic">
                                    El cambio de roles ha sido deshabilitado globalmente por seguridad.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function DeliveryList({ users, loading, onUpdate }) {
    if (loading) return <div className="p-8 text-gray-400">Cargando repartidores...</div>
    if (users.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay repartidores registrados.</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
                <div key={user.id} className="bg-[#111] border border-white/5 p-6 rounded-3xl flex flex-col gap-5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110" />

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform rotate-3">
                            <FaClock size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-white leading-tight">
                                {user.first_name || 'Sin Nombre'} {user.last_name || ''}
                            </h4>
                            <span className="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1 inline-block">Repartidor</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="bg-[#e5242c]/10 p-4 rounded-2xl border border-[#e5242c]/20">
                            <p className="text-[10px] text-[#e5242c] uppercase font-black mb-1 tracking-widest text-center">Código de Acceso</p>
                            <p className="text-white font-black text-3xl tracking-[0.4rem] text-center">{user.delivery_id_card || '----'}</p>
                        </div>

                        <div className="space-y-1 px-2">
                            <p className="text-gray-400 text-sm flex items-center gap-2">
                                <span className="text-blue-500 text-xs">●</span> {user.phone || 'Sin teléfono'}
                            </p>
                            <p className="text-gray-400 text-[11px] flex items-center gap-2 font-mono">
                                <span className="text-blue-500">📧</span> {user.email}
                            </p>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    const id = prompt('Nuevo Código de Acceso (4 dígitos):', user.delivery_id_card || '')
                                    if (id !== null) {
                                        supabase.from('profiles').update({
                                            delivery_id_card: id
                                        }).eq('id', user.id).then(() => onUpdate())
                                    }
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] text-white py-3 rounded-xl transition-colors border border-white/5 uppercase font-bold"
                            >
                                Editar Código
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm(`¿Estás seguro de eliminar a ${user.first_name || 'este repartidor'}? Perderá el acceso de inmediato.`)) {
                                        // Reset role and clear delivery data
                                        const { error } = await supabase.from('profiles').update({
                                            role: 'user',
                                            delivery_id_card: null
                                        }).eq('id', user.id)
                                        if (error) alert(error.message)
                                        else onUpdate()
                                    }
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-3 rounded-xl transition-colors border border-red-500/20"
                                title="Eliminar Repartidor"
                            >
                                <FaPlus className="rotate-45" size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
