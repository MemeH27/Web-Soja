import { useState } from 'react'
import { FaTimes, FaBox, FaPlus, FaEdit, FaCheck } from 'react-icons/fa'
import { supabase } from '../../supabaseClient'

export default function ProductModal({ onClose, product, onSave }) {
    const [formData, setFormData] = useState(product || { id: '', name: '', price: '', category: 'food', image: '' })
    const [uploading, setUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState(product?.image || '')

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido.')
            return
        }

        // Vista previa local inmediata
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`
            const filePath = `${fileName}`

            let { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                })

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('products')
                .getPublicUrl(filePath)

            if (!data?.publicUrl) throw new Error('No se pudo generar la URL pública')

            setFormData(prev => ({ ...prev, image: data.publicUrl }))
        } catch (error) {
            console.error('Upload error:', error)
            alert('Error al procesar la imagen: ' + (error.message || 'Error desconocido'))
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        // Eliminamos campos innecesarios que no existen en la DB actual
        const { available, ...cleanData } = formData
        const { error } = await supabase.from('products').upsert(cleanData)
        if (error) alert(error.message)
        else {
            onSave()
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl relative animate-in fade-in zoom-in duration-300 shadow-2xl">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors bg-white/5 w-10 h-10 rounded-full flex items-center justify-center">
                    <FaTimes size={20} />
                </button>
                <h3 className="text-3xl font-black mb-8 tracking-tight">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 group">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                                    <FaBox size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</p>
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer gap-2 z-10">
                                <div className="w-12 h-12 bg-[#e5242c] rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <FaPlus />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Subir Foto</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-20">
                                    <div className="w-8 h-8 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e5242c]">Subiendo...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">NOMBRE DEL PRODUCTO</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors font-bold"
                                    placeholder="Nombre"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID ÚNICO</label>
                                <input
                                    disabled={!!product}
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors disabled:opacity-50 text-xs tracking-wider"
                                    placeholder="ej: sushi-especial"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">PRECIO (L)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e5242c] transition-colors font-black text-lg"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div className="col-span-2 mt-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">CATEGORÍA</label>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'food', label: 'Comida', icon: '🍱' },
                                        { id: 'drink', label: 'Bebida', icon: '🥤' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all font-bold text-sm ${formData.category === cat.id
                                                ? 'bg-[#e5242c]/10 border-[#e5242c] text-white shadow-[0_0_20px_rgba(229,36,44,0.1)]'
                                                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-lg">{cat.icon}</span>
                                            {cat.label}
                                            {formData.category === cat.id && <FaCheck size={10} className="text-[#e5242c]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                disabled={uploading}
                                className="w-full bg-[#e5242c] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-[#c41e25] transition-all shadow-xl shadow-[#e5242c]/20 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : product ? (
                                    <><FaEdit /> Guardar Cambios</>
                                ) : (
                                    <><FaPlus /> Crear Producto</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

