import { useState } from 'react'
import { FaStar, FaTimes } from 'react-icons/fa'
import { supabase } from '../supabaseClient'

export default function ReviewForm({ user, onClose, onSave }) {
    const [rating, setRating] = useState(5)
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!content.trim()) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    author: user ? `${user.user_metadata?.first_name || 'Cliente'} ${user.user_metadata?.last_name || ''}`.trim() : 'Cliente Invitado',
                    meta: new Date().toLocaleDateString(),
                    rating,
                    content,
                    published: false // Siempre falso por defecto para moderación
                })

            if (error) throw error

            alert('¡Gracias! Tu reseña ha sido enviada y está pendiente de moderación.')
            if (onSave) onSave()
            onClose()
        } catch (err) {
            alert('Error al enviar reseña: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white">
                    <FaTimes size={20} />
                </button>

                <h3 className="text-2xl font-bold text-white mb-2 font-serif text-center">Deja tu opinión</h3>
                <p className="text-gray-400 text-sm mb-6 text-center">Tu experiencia nos ayuda a mejorar.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-2xl transition-all ${star <= rating ? 'text-yellow-500 scale-110' : 'text-gray-700 hover:text-gray-500'}`}
                            >
                                <FaStar />
                            </button>
                        ))}
                    </div>

                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="¿Qué te pareció la comida y el servicio?"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-600 outline-none focus:border-[#e5242c] transition-colors h-32 resize-none"
                            required
                        ></textarea>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-[#e5242c] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#c41e25] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : 'Enviar Reseña'}
                    </button>
                </form>
            </div>
        </div>
    )
}
