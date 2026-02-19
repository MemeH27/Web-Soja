import { useState } from 'react'
import { FaUser, FaClock, FaEnvelope, FaPhone, FaShieldHalved, FaXmark, FaMotorcycle } from 'react-icons/fa6'
import { supabase } from '../../supabaseClient'

export default function UsersList({ users, loading, onUpdate }) {
    const [selectedUser, setSelectedUser] = useState(null)

    if (loading) return <div className="p-8 text-gray-400">Cargando usuarios...</div>
    if (users.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay usuarios registrados en el sistema.</div>

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {users.map(user => {
                    const isAdmin = user.role === 'admin'
                    const isDelivery = user.role === 'delivery'

                    return (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="bg-[#111] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 group hover:border-[#e5242c]/30 hover:bg-white/[0.02] transition-all cursor-pointer relative"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isAdmin ? 'bg-[#e5242c]/20 text-[#e5242c]' : isDelivery ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                                    {isDelivery ? <FaMotorcycle size={14} /> : <FaUser size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-xs truncate">
                                        {user.first_name} {user.last_name}
                                    </h4>
                                    <p className="text-[9px] text-gray-500 truncate font-medium">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-[0.1em] ${isAdmin ? 'bg-[#e5242c] text-white' : isDelivery ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-500'}`}>
                                    {user.role || 'USER'}
                                </span>
                                <div className="text-gray-600 group-hover:text-white transition-colors">
                                    <FaClock size={10} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    )
}

function UserDetailModal({ user, onClose }) {
    const isAdmin = user.role === 'admin'

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-all"
                    >
                        <FaXmark size={20} />
                    </button>

                    <div className="flex items-center gap-6 mb-8">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl ${isAdmin ? 'bg-[#e5242c]/20 text-[#e5242c]' : 'bg-blue-500/20 text-blue-400'}`}>
                            {user.role === 'delivery' ? <FaMotorcycle /> : <FaUser />}
                        </div>
                        <div>
                            <p className="text-[#e5242c] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Detalles de Usuario</p>
                            <h2 className="text-3xl font-black text-white">{user.first_name} {user.last_name}</h2>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DetailBox icon={<FaEnvelope />} label="Email" value={user.email} />
                            <DetailBox icon={<FaPhone />} label="Teléfono" value={user.phone || 'No registrado'} />
                        </div>
                        <DetailBox
                            icon={<FaShieldHalved />}
                            label="Rol en el Sistema"
                            value={user.role?.toUpperCase() || 'USUARIO'}
                            isBadge
                            badgeColor={isAdmin ? 'bg-[#e5242c]' : user.role === 'delivery' ? 'bg-blue-600' : 'bg-white/10'}
                        />

                        {user.role === 'delivery' && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Info Repartidor</span>
                                    <FaMotorcycle className="text-blue-400" />
                                </div>
                                <p className="text-white font-bold">Código: <span className="text-xl font-black ml-2 tracking-widest font-mono text-blue-400">{user.delivery_id_card || '----'}</span></p>
                            </div>
                        )}

                        <div className="bg-[#e5242c]/5 border border-[#e5242c]/10 rounded-2xl p-6 mt-6">
                            <div className="flex items-center gap-3 mb-2">
                                <FaShieldHalved className="text-[#e5242c]" />
                                <span className="text-[#e5242c] text-[10px] font-black uppercase tracking-widest">Seguridad de Cuenta</span>
                            </div>
                            <p className="text-gray-500 text-xs italic leading-relaxed">
                                El cambio de roles y la edición de perfiles de otros usuarios está deshabilitada globalmente para prevenir brechas de seguridad.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl mt-8 transition-all border border-white/10"
                    >
                        Cerrar Panel
                    </button>
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
