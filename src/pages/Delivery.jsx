import { useState, useEffect } from 'react'
import { FaMotorcycle, FaBox, FaMapMarkerAlt, FaCheckCircle, FaSignOutAlt, FaPhone } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Delivery({ setView }) {
    const { profile, signOut, user, loading: authLoading, refreshProfile } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [isOnboarding, setIsOnboarding] = useState(false)
    const [onboardingData, setOnboardingData] = useState({ firstName: '', lastName: '' })

    // Check if delivery staff needs onboarding (missing Code)
    useEffect(() => {
        if (profile && profile.role === 'delivery' && !profile.delivery_number) {
            setIsOnboarding(true)
        } else {
            setIsOnboarding(false)
        }
    }, [profile])

    const handleOnboarding = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Generar un número de repartidor basado en el total de repartidores + 1
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'delivery')

            const nextNum = `REP-${String(count + 1).padStart(3, '0')}`
            const nextId = `ID-${Math.floor(1000 + Math.random() * 9000)}`

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: onboardingData.firstName,
                    last_name: onboardingData.lastName,
                    delivery_number: nextNum,
                    delivery_id_card: nextId
                })
                .eq('id', user.id)

            if (error) throw error
            await refreshProfile()
            setIsOnboarding(false)
        } catch (err) {
            alert('Error en registro: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Loading state while verifying role
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Cargando panel de entregas...</p>
            </div>
        )
    }

    useEffect(() => {
        if (user) {
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
    }, [user])

    const fetchAssignedOrders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('delivery_id', user.id)
            .in('status', ['prepared', 'shipped'])
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setLoading(false)
    }

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) alert(error.message)
        else fetchAssignedOrders()
    }

    const handleLogout = async () => {
        await signOut()
        setView('home')
    }

    if (isOnboarding) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
                <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-[#e5242c]/10 rounded-full flex items-center justify-center text-[#e5242c]">
                            <FaMotorcycle size={40} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2">Registro de Repartidor</h2>
                    <p className="text-gray-500 text-center text-sm mb-8">Parece que es tu primer ingreso. Por favor, completa tu perfil profesional.</p>

                    <form onSubmit={handleOnboarding} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nombre(s)"
                            required
                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-[#e5242c] transition-all"
                            value={onboardingData.firstName}
                            onChange={e => setOnboardingData({ ...onboardingData, firstName: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Apellido(s)"
                            required
                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-[#e5242c] transition-all"
                            value={onboardingData.lastName}
                            onChange={e => setOnboardingData({ ...onboardingData, lastName: e.target.value })}
                        />
                        <button
                            disabled={loading}
                            className="w-full bg-[#e5242c] text-white py-4 rounded-2xl font-bold hover:bg-[#c41e25] transition-all disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Generando ID...' : 'Comenzar a Trabajar'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="bg-[#111] border-b border-white/10 p-6 sticky top-0 z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src="/img/logo/logo_blanco.png" alt="SOJA" className="h-8" />
                    <div className="flex flex-col">
                        <span className="bg-[#e5242c] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-fit">Repartidor</span>
                        <span className="text-[10px] text-gray-400 mt-1 font-mono uppercase tracking-tighter">
                            {profile?.first_name} | {profile?.delivery_number}
                        </span>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">
                    <FaSignOutAlt size={20} />
                </button>
            </header>

            <main className="p-6 max-w-md mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Dashboard de Entregas 🛵</h2>
                    <p className="text-gray-500 text-sm">
                        Bienvenido, <strong>{profile?.first_name} {profile?.last_name}</strong>.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Cargando tus pedidos...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-10 text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                            <FaMotorcycle size={40} />
                        </div>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        {order.status === 'prepared' ? (
                                            <button
                                                onClick={() => updateStatus(order.id, 'shipped')}
                                                className="col-span-2 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                                            >
                                                <FaMotorcycle /> Iniciar Entrega
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(order.id, 'delivered')}
                                                className="col-span-2 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95"
                                            >
                                                <FaCheckCircle /> Marcar como Entregado
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
