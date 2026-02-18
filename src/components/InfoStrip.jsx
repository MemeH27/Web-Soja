import { FaUtensils, FaMotorcycle, FaStar } from 'react-icons/fa6'
import ScrollReveal from './ScrollReveal'

export default function InfoStrip() {
    return (
        <section className="bg-[#e5242c] text-white py-8 relative overflow-hidden">
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="max-w-[1180px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative z-10">
                <ScrollReveal delay={0}>
                    <div className="flex flex-col items-center gap-2 group">
                        <div className="bg-white/20 p-4 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
                            <FaUtensils className="text-2xl" />
                        </div>
                        <h3 className="font-bold text-lg uppercase tracking-wider">Sabor Autentico</h3>
                        <p className="text-white/80 text-sm max-w-[250px]">Recetas tradicionales preparadas con tecnicas milenarias.</p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                    <div className="flex flex-col items-center gap-2 group">
                        <div className="bg-white/20 p-4 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
                            <FaMotorcycle className="text-2xl" />
                        </div>
                        <h3 className="font-bold text-lg uppercase tracking-wider">Envio Rapido</h3>
                        <p className="text-white/80 text-sm max-w-[250px]">Llegamos calientes y listos para comer hasta tu puerta.</p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={400}>
                    <div className="flex flex-col items-center gap-2 group">
                        <div className="bg-white/20 p-4 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
                            <FaStar className="text-2xl" />
                        </div>
                        <h3 className="font-bold text-lg uppercase tracking-wider">Calidad Premium</h3>
                        <p className="text-white/80 text-sm max-w-[250px]">Ingredientes frescos seleccionados diariamente.</p>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    )
}
