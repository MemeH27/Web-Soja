import { useState, useEffect } from 'react'
import { FaBox, FaPlus, FaSignOutAlt, FaTimes, FaMapMarkerAlt, FaMotorcycle, FaTrash, FaCheck, FaEdit, FaStar, FaUser, FaClock, FaChevronDown, FaBars, FaChartLine } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useMenu } from '../hooks/useMenu'
import { useReviews } from '../hooks/useReviews'
import LocationPicker from '../components/LocationPicker'
import PushNotificationToggle from '../components/shared/PushNotificationToggle'
import OrderTracking from '../components/OrderTracking'

// Nuevos componentes modulares
import Dashboard from '../components/admin/Dashboard'
import OrdersList from '../components/admin/OrdersList'
import ProductsList from '../components/admin/ProductsList'
import ProductModal from '../components/admin/ProductModal'
import UsersList from '../components/admin/UsersList'
import DeliveryList from '../components/admin/DeliveryList'
import ReviewsList from '../components/admin/ReviewsList'

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

