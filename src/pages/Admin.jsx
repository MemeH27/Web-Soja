import { useState, useEffect } from 'react'
import { FaBox, FaStar, FaSignOutAlt, FaPlus, FaTrash, FaEdit, FaTimes, FaUser, FaClock, FaCheckCircle } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useMenu } from '../hooks/useMenu'
import { useReviews } from '../hooks/useReviews'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Admin({ setView }) {
    const { profile, role, signOut, loading: authLoading } = useAuth()
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
    const [activeTab, setActiveTab] = useState('products')
    const { menu, loading: menuLoading, setMenu } = useMenu()
    const { reviews, loading: reviewsLoading, setReviews } = useReviews()
    const [usersList, setUsersList] = useState([])
    const [ordersList, setOrdersList] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)

    // Delivery system state
    const [deliveryUsers, setDeliveryUsers] = useState([])
    const [loadingDelivery, setLoadingDelivery] = useState(false)
    const [showUserRoleModal, setShowUserRoleModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)

    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
        if (activeTab === 'orders') {
            fetchOrders()
            fetchDeliveryUsers()
        }
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
            .order('created_at', { ascending: false })

        if (data) {
            console.log('✅ Usuarios recibidos:', data.length, data)
            setUsersList(data)
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

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex">
            {/* Sidebar remains same but add signOut logic */}
            <aside className="w-64 bg-[#111] border-r border-white/10 flex flex-col p-6 sticky top-0 h-screen">
                <div className="mb-12">
                    <img src="/img/logo/logo_blanco.png" alt="SOJA Logo" className="h-10 mb-2" />
                    <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Admin Panel</p>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-[#e5242c] text-white' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaBox /> Productos
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-[#e5242c] text-white' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaBox /> Pedidos
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-[#e5242c] text-white' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaUser /> Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reviews' ? 'bg-[#e5242c] text-white' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <FaStar /> Reseñas
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="mt-auto flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                    <FaSignOutAlt /> Cerrar Sesión
                </button>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-10 overflow-y-auto">
                <header className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-bold">
                        {activeTab === 'products' ? 'Gestionar Productos' :
                            activeTab === 'orders' ? 'Gestionar Pedidos' :
                                activeTab === 'users' ? 'Gestionar Usuarios' :
                                    'Gestionar Reseñas'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (activeTab === 'users') fetchUsers()
                                if (activeTab === 'orders') fetchOrders()
                                if (activeTab === 'products') window.location.reload()
                            }}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 p-2 rounded-lg transition-all"
                            title="Refrescar datos"
                        >
                            Refrescar
                        </button>
                        {activeTab === 'products' && (
                            <button
                                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                className="bg-[#e5242c] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                            >
                                <FaPlus /> Añadir Producto
                            </button>
                        )}
                    </div>
                </header>

                {activeTab === 'products' ? (
                    <ProductsList products={menu} loading={menuLoading} onDelete={handleDeleteProduct} onEdit={(p) => { setEditingProduct(p); setShowProductModal(true); }} />
                ) : activeTab === 'orders' ? (
                    <OrdersList orders={ordersList} loading={loadingOrders} deliveryUsers={deliveryUsers} onUpdate={fetchOrders} />
                ) : activeTab === 'users' ? (
                    <UsersList users={usersList} loading={loadingUsers} onUpdate={fetchUsers} />
                ) : (
                    <ReviewsList reviews={reviews} loading={reviewsLoading} onDelete={handleDeleteReview} />
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
        </div>
    )
}

function ProductsList({ products, loading, onDelete, onEdit }) {
    if (loading) return <div>Cargando productos...</div>

    return (
        <div className="grid gap-4">
            {products.map(product => (
                <div key={product.id} className="bg-[#111] border border-white/5 p-4 rounded-2xl flex items-center gap-6 group hover:border-white/20 transition-colors">
                    <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                        <h4 className="font-bold text-lg">{product.name}</h4>
                        <p className="text-gray-500 text-sm italic capitalize">{product.category}</p>
                    </div>
                    <div className="font-bold text-xl text-[#e5242c]">L {product.price}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(product)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-blue-400 transition-all active:scale-95"
                        >
                            <FaEdit />
                        </button>
                        <button
                            onClick={() => onDelete(product.id)}
                            className="p-3 bg-white/5 hover:bg-red-500/20 rounded-xl text-red-500 transition-all active:scale-95"
                        >
                            <FaTrash />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ReviewsList({ reviews, loading, onDelete }) {
    if (loading) return <div>Cargando reseñas...</div>

    return (
        <div className="grid gap-4">
            {reviews.map(review => (
                <div key={review.id} className="bg-[#111] border border-white/5 p-6 rounded-2xl relative group">
                    <div className="flex justify-between mb-4">
                        <div>
                            <h4 className="font-bold">{review.author}</h4>
                            <p className="text-xs text-gray-500">{review.meta}</p>
                        </div>
                        <div className="flex text-yellow-500">
                            {[...Array(review.rating)].map((_, i) => <FaStar key={i} size={12} />)}
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-4 leading-relaxed group-hover:text-white transition-colors">"{review.content}"</p>
                    <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                            onClick={() => onDelete(review.id)}
                            className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"
                        >
                            <FaTrash /> Eliminar Reseña
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ProductModal({ onClose, product, onSave }) {
    const [formData, setFormData] = useState(product || { id: '', name: '', price: '', category: 'food', image: '' })

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
            <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-lg relative animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
                    <FaTimes size={24} />
                </button>
                <h3 className="text-2xl font-bold mb-8">{product ? 'Editar Producto' : 'Añadir Producto'}</h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">ID ÚNICO</label>
                        <input
                            disabled={!!product}
                            value={formData.id}
                            onChange={e => setFormData({ ...formData, id: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-[#e5242c] transition-colors disabled:opacity-50"
                            placeholder="ej: arroz-frito"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">NOMBRE</label>
                        <input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-[#e5242c] transition-colors"
                            placeholder="ej: Arroz Frito"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">PRECIO (HNL)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-[#e5242c] transition-colors"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">CATEGORÍA</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-[#e5242c] transition-colors"
                            >
                                <option value="food">Comida</option>
                                <option value="drink">Bebida</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL DE IMAGEN</label>
                        <input
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-[#e5242c] transition-colors"
                            placeholder="/img/productos/..."
                            required
                        />
                    </div>
                    <button className="w-full bg-[#e5242c] text-white py-4 rounded-xl font-bold hover:bg-[#c41e25] transition-all shadow-lg active:scale-95">
                        {product ? 'Guardar Cambios' : 'Añadir Producto'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function OrdersList({ orders, loading, deliveryUsers, onUpdate }) {
    if (loading) return <div className="p-8 text-gray-400">Cargando pedidos...</div>
    if (orders.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay pedidos registrados en el sistema.</div>

    const assignDelivery = async (orderId, deliveryId) => {
        const { error } = await supabase
            .from('orders')
            .update({ delivery_id: deliveryId, status: 'prepared' })
            .eq('id', orderId)

        if (error) alert(error.message)
        else onUpdate()
    }

    return (
        <div className="grid gap-6">
            {orders.map(order => (
                <div key={order.id} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between group hover:border-[#e5242c]/20 transition-all shadow-xl gap-6">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="w-14 h-14 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] rotate-3 group-hover:rotate-0 transition-transform">
                            <FaClock size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-bold text-xl text-white">{order.client_name}</h4>
                                <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                    order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    {order.status === 'pending' ? 'Pendiente' :
                                        order.status === 'prepared' ? 'Preparado' :
                                            order.status === 'shipped' ? 'En Camino' : 'Entregado'}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm flex items-center gap-4">
                                <span className="flex items-center gap-2"><FaUser size={12} className="text-[#e5242c]" /> {order.client_phone}</span>
                                <span className="text-gray-600">•</span>
                                <span>{new Date(order.created_at).toLocaleString()}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="text-right">
                            <div className="font-bold text-2xl text-white">L {Number(order.total).toFixed(2)}</div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-black">{order.delivery_type === 'delivery' ? 'A Domicilio' : 'Para llevar'}</p>
                        </div>

                        {order.delivery_type === 'delivery' && (
                            <div className="w-full md:w-auto">
                                <select
                                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#e5242c] transition-colors"
                                    value={order.delivery_id || ''}
                                    onChange={(e) => assignDelivery(order.id, e.target.value)}
                                >
                                    <option value="">Asignar Repartidor</option>
                                    {deliveryUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function UsersList({ users, loading, onUpdate }) {
    if (loading) return <div className="p-8 text-gray-400">Cargando usuarios...</div>
    if (users.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay usuarios registrados en el sistema.</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
                <div key={user.id} className="bg-[#111] border border-white/5 p-6 rounded-3xl flex flex-col gap-5 hover:border-[#e5242c]/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#e5242c]/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110" />

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] group-hover:scale-105 transition-transform rotate-3">
                            <FaUser size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-white leading-tight">
                                {user.first_name || 'Sin Nombre'} {user.last_name || ''}
                            </h4>
                            <div className="flex gap-2 mt-1">
                                {user.role === 'admin' && <span className="bg-[#e5242c] text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Administrador</span>}
                                {user.role === 'delivery' && <span className="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Repartidor</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span className="text-[#e5242c] text-xs">●</span> {user.phone || 'Sin teléfono'}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span className="text-[#e5242c] text-xs">●</span> {user.email || 'Sin correo registrado'}
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono truncate bg-black/30 p-2 rounded-lg mt-2" title={user.id}>
                            UID: {user.id}
                        </p>
                        <select
                            className="w-full mt-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-400 outline-none focus:border-[#e5242c]"
                            value={user.role || 'user'}
                            onChange={async (e) => {
                                const { error } = await supabase.from('profiles').update({ role: e.target.value }).eq('id', user.id)
                                if (error) alert(error.message)
                                else onUpdate()
                            }}
                        >
                            <option value="user">Cliente Estándar</option>
                            <option value="delivery">Repartidor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>
            ))}
        </div>
    )
}
