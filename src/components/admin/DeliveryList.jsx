import { FaClock, FaPlus } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function DeliveryList({ users, loading, onUpdate }) {
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
