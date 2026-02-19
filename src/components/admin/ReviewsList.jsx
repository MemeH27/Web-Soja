import { useState } from 'react'
import { FaStar, FaCheck, FaTrash } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function ReviewsList({ reviews, loading, onDelete, onUpdate }) {
    const [moderationTab, setModerationTab] = useState('pending')
    if (loading) return <div className="p-8 text-gray-400">Cargando reseñas...</div>

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
