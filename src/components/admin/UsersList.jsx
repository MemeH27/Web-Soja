import { FaUser, FaClock } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function UsersList({ users, loading, onUpdate }) {
    if (loading) return <div className="p-8 text-gray-400">Cargando usuarios...</div>
    if (users.length === 0) return <div className="text-gray-500 italic p-8 bg-[#111] rounded-2xl border border-white/5">No hay usuarios registrados en el sistema.</div>

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
