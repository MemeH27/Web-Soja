import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../supabaseClient'
import { FaUser, FaPhone, FaLocationDot, FaPenToSquare, FaFloppyDisk, FaXmark, FaRightFromBracket } from 'react-icons/fa6'
import LocationPicker from '../components/LocationPicker'
import PushNotificationToggle from '../components/shared/PushNotificationToggle'

export default function Profile({ onBack, setCart }) {
    const { user, profile, updateProfile, signOut } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [showLocationPicker, setShowLocationPicker] = useState(false)

    const [firstName, setFirstName] = useState(profile?.first_name || '')
    const [lastName, setLastName] = useState(profile?.last_name || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [address, setAddress] = useState(profile?.address || '')
    const [location, setLocation] = useState(profile?.location || null)

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '')
            setLastName(profile.last_name || '')
            setPhone(profile.phone || '')
            setAddress(profile.address || '')
            setLocation(profile.location || null)
        }
    }, [profile])

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const { error: updateError } = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                address: address,
                location: location
            })

            if (updateError) throw updateError
            setSuccess('Perfil actualizado con éxito')
            setIsEditing(false)
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        onBack()
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-2 italic bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                            Mi <span className="text-[#e5242c]">Perfil</span>
                        </h1>
                        <p className="text-gray-400 font-medium tracking-tight">Gestiona tu experiencia en SOJA.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold border border-white/10 backdrop-blur-md active:scale-95"
                        >
                            <FaXmark /> Volver
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/10 hover:bg-[#e5242c] text-[#e5242c] hover:text-white px-6 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold border border-[#e5242c]/20 active:scale-95"
                        >
                            <FaRightFromBracket /> Salir
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar / Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e5242c] to-transparent" />
                            <div className="w-24 h-24 bg-gradient-to-br from-[#e5242c]/20 to-transparent rounded-full flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500 border border-white/5">
                                <FaUser size={40} className="text-[#e5242c]" />
                            </div>
                            <h2 className="text-2xl font-bold mb-1 tracking-tight">{profile?.first_name} {profile?.last_name}</h2>
                            <p className="text-gray-500 text-sm mb-6 font-medium">
                                {user.email}
                            </p>
                            <div className="w-full pt-6 border-t border-white/5 space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                    <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Cuenta</span>
                                    <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Verificada</span>
                                </div>
                                <div className="pt-2">
                                    <PushNotificationToggle user={user} role={profile?.role || 'user'} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e5242c]/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-bold tracking-tight">
                                    Datos Personales
                                </h3>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-[#e5242c] hover:bg-[#e5242c]/10 px-4 py-2 rounded-xl transition-all font-bold flex items-center gap-2 text-sm border border-[#e5242c]/20"
                                    >
                                        <FaPenToSquare /> Editar Datos
                                    </button>
                                )}
                            </div>

                            {success && (
                                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl text-sm font-medium animate-fade-in flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nombre</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                disabled={!isEditing}
                                                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-[#e5242c] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                placeholder="Tu nombre"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Apellido</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={!isEditing}
                                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-[#e5242c] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                            placeholder="Tu apellido"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Teléfono</label>
                                    <div className="relative group">
                                        <FaPhone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#e5242c] transition-colors" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={!isEditing}
                                            className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-5 py-3 focus:outline-none focus:border-[#e5242c] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium tracking-wide"
                                            placeholder="Ej: 9999-9999"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FaLocationDot className="text-[#e5242c]" />
                                        <h4 className="font-bold text-sm tracking-tight">Dirección de Entrega</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Reseña o Punto de Referencia</label>
                                        <textarea
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            disabled={!isEditing}
                                            rows="3"
                                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#e5242c] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                            placeholder="Barrio, calle, número de casa, punto de referencia..."
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-black border border-white/10 p-5 rounded-2xl">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold mb-1">Ubicación Precisa</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                                                {location ? '✓ Ubicación guardada' : '⚠️ No se ha fijado ubicación'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!isEditing}
                                            onClick={() => setShowLocationPicker(true)}
                                            className="w-full sm:w-auto bg-[#e5242c]/10 text-[#e5242c] hover:bg-[#e5242c] hover:text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs border border-[#e5242c]/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <FaLocationDot /> {location ? 'Actualizar Pin' : 'Configurar Mapa'}
                                        </button>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="pt-8 flex gap-4 border-t border-white/5">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-[#e5242c] text-white py-4 rounded-2xl font-bold hover:bg-[#c41e25] transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-900/20 active:scale-95"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaFloppyDisk /> Guardar Cambios</>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-8 bg-white/5 text-gray-400 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95"
                                        >
                                            <FaXmark /> Cancelar
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {showLocationPicker && (
                <LocationPicker
                    location={location}
                    setLocation={setLocation}
                    onClose={() => setShowLocationPicker(false)}
                />
            )}
        </div>
    )
}
