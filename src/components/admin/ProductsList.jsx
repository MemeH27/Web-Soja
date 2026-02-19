import { FaCheckCircle, FaEdit, FaTrash } from 'react-icons/fa'

export default function ProductsList({ products, loading, onDelete, onEdit, onToggleStock }) {
    if (loading) return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-64 bg-white/5 rounded-3xl" />
            ))}
        </div>
    )

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map(product => (
                <div key={product.id} className={`bg-[#111] border rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#e5242c]/5 ${product.available === false ? 'border-red-500/30 opacity-60' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="relative aspect-square overflow-hidden bg-black">
                        <img
                            src={product.image || '/img/placeholder-dish.png'}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => { e.target.src = '/img/logo/logo_blanco.png'; e.target.className = 'w-full h-full object-contain p-8 opacity-20'; }}
                        />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleStock(product); }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${product.available === false ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                title={product.available === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                            >
                                <FaCheckCircle size={14} className={product.available === false ? 'opacity-40' : 'text-green-400'} />
                            </button>
                        </div>
                        {product.available === false && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                                <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Agotado</span>
                            </div>
                        )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#e5242c]/60 mb-1 block">{product.category === 'food' ? 'Platillo' : 'Bebida'}</span>
                            <h4 className="font-bold text-base line-clamp-2 leading-tight group-hover:text-[#e5242c] transition-colors">{product.name}</h4>
                        </div>
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="font-black text-lg text-white">L {Number(product.price).toFixed(0)}</div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onEdit(product)}
                                    className="w-8 h-8 bg-white/5 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg flex items-center justify-center transition-all active:scale-95 border border-white/5"
                                >
                                    <FaEdit size={12} />
                                </button>
                                <button
                                    onClick={() => onDelete(product.id)}
                                    className="w-8 h-8 bg-white/5 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center transition-all active:scale-95 border border-white/5"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
