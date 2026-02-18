import { useMemo } from 'react'
import { FaAward, FaStar, FaClock, FaLeaf, FaBagShopping } from 'react-icons/fa6'
import { featuredDishIds, featuredHighlights } from '../data'
import ScrollReveal from './ScrollReveal'

function formatHNL(value) {
    return `L ${value.toFixed(2)}`
}

export default function Featured({ setView, menu = [] }) {
    const featuredItems = useMemo(() => menu.filter((item) => featuredDishIds.includes(item.id)), [menu])

    return (
        <section id="destacados" className="section max-w-[1180px] mx-auto px-6 py-24">
            <ScrollReveal>
                <div className="section-heading flex flex-col md:flex-row items-center md:items-end justify-between mb-12 gap-6 text-center md:text-left">
                    <div>
                        <p className="text-[#e5242c] uppercase tracking-widest text-sm font-bold mb-3">Experiencia gastronomica</p>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-white">Recomendados del chef</h2>
                    </div>
                    <button
                        className="bg-[#e5242c] text-white hover:bg-white hover:text-[#e5242c] px-8 py-3 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm shadow-lg hover:shadow-xl"
                        onClick={() => setView('order')}
                    >
                        Ver Menú Completo
                    </button>
                </div>
            </ScrollReveal>

            <div className="featured-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredItems.map((item, index) => (
                    <ScrollReveal key={item.id} delay={index * 100}>
                        <article
                            className="featured-card bg-[#111] border border-white/10 rounded-3xl overflow-hidden group hover:-translate-y-2 hover:border-[#e5242c]/50 hover:shadow-[0_20px_40px_-10px_rgba(229,36,44,0.2)] transition-all duration-500 flex flex-col h-full"
                        >
                            <div className="featured-image-wrap relative h-64 overflow-hidden">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80"></div>

                                <span className="featured-price absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white font-bold px-4 py-2 rounded-full border border-white/10 shadow-xl">
                                    {formatHNL(item.price)}
                                </span>
                                <span className="featured-badge absolute bottom-4 left-4 bg-[#e5242c] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform group-hover:scale-105 transition-transform">
                                    <FaAward /> {featuredHighlights[index]}
                                </span>
                            </div>

                            <div className="featured-info p-6 flex flex-col flex-grow">
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#e5242c] transition-colors">{item.name}</h3>
                                <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">Deliciosa combinacion de sabores tradicionales preparada al momento en nuestro wok.</p>

                                <div className="featured-meta flex items-center gap-4 mb-6 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">
                                        <FaStar /> 4.8
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <FaClock /> 15m
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                                        <FaLeaf /> Fresco
                                    </div>
                                </div>

                                <button
                                    onClick={() => setView('order')}
                                    className="mt-auto w-full bg-[#222] text-white py-3 rounded-xl font-bold border border-white/5 hover:bg-[#e5242c] hover:border-[#e5242c] transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                                >
                                    <FaBagShopping className="group-hover/btn:animate-bounce" /> Agregar al pedido
                                </button>
                            </div>
                        </article>
                    </ScrollReveal>
                ))}
            </div>
        </section>
    )
}
