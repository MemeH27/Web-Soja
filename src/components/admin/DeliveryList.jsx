import { useState } from 'react'
import { FaMotorcycle, FaPlus, FaTimes, FaPhone, FaUser, FaKey } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

// Modal para mostrar el código generado al admin
function NewDeliveryCodeModal({ code, name, onClose }) {
    return (
        <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[#111] border border-green-500/40 rounded-[2.2rem] p-8 text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-20 h-20 mx-auto mb-5 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center text-4xl">
                    🛵
                </div>
                <p className="text-green-400 text-[11px] font-black uppercase tracking-[0.18rem] mb-2">Repartidor Creado</p>
                <h3 className="text-white text-2xl font-black mb-2">{name}</h3>
                <p className="text-gray-400 text-sm mb-5">Su código de acceso es:</p>
                <div className="bg-black/60 border-2 border-dashed border-green-500/40 rounded-3xl p-6 mb-5">
                    <p className="text-white text-6xl font-black tracking-[0.6rem] leading-none">{code}</p>
                </div>
                <p className="text-yellow-400/90 text-xs font-black uppercase tracking-wider mb-7">
                    Guarda este código. No se mostrará de nuevo.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}

// Modal para crear nuevo repartidor
function CreateDeliveryModal({ existingCodes, onClose, onCreated }) {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Generate a unique 4-digit code not already in use
    const generateUniqueCode = () => {
        const existingSet = new Set(existingCodes.map(c => String(c).padStart(4, '0')))
        let attempts = 0
        while (attempts < 1000) {
            const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
            if (!existingSet.has(code)) return code
            attempts++
        }
        throw new Error('No hay códigos disponibles')
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setError(null)

        if (!firstName.trim()) { setError('El nombre es requerido'); return }
        if (phone.length !== 8) { setError('El teléfono debe tener 8 dígitos después del +504'); return }

        setLoading(true)
        try {
            const code = generateUniqueCode()
            const email = `s${code}@soja.me`
            const fullPhone = `+504${phone}`

            // Obtener el token de sesión actual explícitamente para garantizar
            // que la Edge Function reciba el JWT del admin (no el anon key)
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData?.session?.access_token

            if (!token) {
                throw new Error('No hay sesión activa. Por favor, recarga la página e inicia sesión nuevamente.')
            }

            // Invocar la Edge Function con el token explícito en los headers
            const { data, error } = await supabase.functions.invoke('create-delivery-user', {
                body: {
                    code,
                    email,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: fullPhone
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (error) {
                console.error('Edge Function Error:', error)
                // Intentar leer el cuerpo del error para obtener más detalles
                let msg = error.message || 'Error desconocido'
                if (error.context) {
                    try {
                        const errBody = await error.context.json()
                        if (errBody?.error) msg = errBody.error
                        if (errBody?.hint) msg += `\n\nTip: ${errBody.hint}`
                    } catch (_) { }
                }
                if (msg.includes('non-2xx') || msg.includes('Edge Function')) {
                    msg = 'Error en el servidor. Revisa los Logs de la función en el Dashboard de Supabase.'
                }
                throw new Error(msg)
            }
            if (data?.error) {
                const hint = data.hint ? `\n\nTip: ${data.hint}` : ''
                throw new Error(data.error + hint)
            }

            onCreated(code, `${firstName.trim()} ${lastName.trim()}`)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Nuevo Repartidor</p>
                            <h2 className="text-2xl font-black text-white">Crear Cuenta</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-all"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Nombre"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Apellido"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone with +504 prefix */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-all">
                            <span className="flex items-center gap-2 pl-4 pr-3 py-4 text-gray-400 font-bold text-sm border-r border-white/10 shrink-0 select-none">
                                <FaPhone className="text-gray-500 text-xs" />
                                +504
                            </span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                                    setPhone(digits)
                                }}
                                placeholder="XXXX-XXXX"
                                maxLength={8}
                                className="flex-1 bg-transparent py-4 px-3 text-white text-sm outline-none"
                                required
                            />
                            <span className="pr-4 text-xs text-gray-600 font-mono">{phone.length}/8</span>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FaKey className="text-blue-400 text-xs" />
                                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Código de Acceso</span>
                            </div>
                            <p className="text-gray-400 text-xs">
                                Se generará automáticamente un código único de 4 dígitos para este repartidor.
                            </p>
                        </div>

                        {error && (
                            <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-4 rounded-xl">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? 'Creando...' : (
                                <>
                                    <FaMotorcycle />
                                    Crear Repartidor
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function DeliveryList({ users, loading, onUpdate }) {
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newDeliveryCode, setNewDeliveryCode] = useState(null)
    const [newDeliveryName, setNewDeliveryName] = useState('')

    if (loading) return <div className="p-8 text-gray-400">Cargando repartidores...</div>

    const existingCodes = users.map(u => u.delivery_id_card).filter(Boolean)

    const handleDeliveryCreated = (code, name) => {
        setShowCreateModal(false)
        setNewDeliveryCode(code)
        setNewDeliveryName(name)
        onUpdate()
    }

    return (
        <div className="space-y-6">
            {/* Header with Create button */}
            <div className="flex justify-between items-center">
                <p className="text-gray-500 text-sm">{users.length} repartidor{users.length !== 1 ? 'es' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm shadow-lg shadow-blue-500/20"
                >
                    <FaPlus size={12} />
                    Nuevo Repartidor
                </button>
            </div>

            {users.length === 0 ? (
                <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5 text-center">
                    No hay repartidores registrados. Crea el primero.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map(user => (
                        <div key={user.id} className="bg-[#111] border border-white/5 p-6 rounded-3xl flex flex-col gap-5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110" />

                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform rotate-3">
                                    <FaMotorcycle size={24} />
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
                                                const clean = id.replace(/\D/g, '').slice(0, 4)
                                                if (clean.length === 4) {
                                                    supabase.from('profiles').update({
                                                        delivery_id_card: clean
                                                    }).eq('id', user.id).then(() => onUpdate())
                                                } else {
                                                    alert('El código debe tener exactamente 4 dígitos')
                                                }
                                            }
                                        }}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] text-white py-3 rounded-xl transition-colors border border-white/5 uppercase font-bold"
                                    >
                                        Editar Código
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm(`¿Estás seguro de eliminar a ${user.first_name || 'este repartidor'}? Perderá el acceso de inmediato.`)) {
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
                                        <FaTimes size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Delivery Modal */}
            {showCreateModal && (
                <CreateDeliveryModal
                    existingCodes={existingCodes}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleDeliveryCreated}
                />
            )}

            {/* Show generated code modal */}
            {newDeliveryCode && (
                <NewDeliveryCodeModal
                    code={newDeliveryCode}
                    name={newDeliveryName}
                    onClose={() => setNewDeliveryCode(null)}
                />
            )}
        </div>
    )
}
