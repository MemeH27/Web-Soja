import { FaUtensils, FaLocationDot } from 'react-icons/fa6'
import ScrollReveal from './ScrollReveal'
import ShinyText from './Animations/ShinyText'
import VariableProximity from './Animations/VariableProximity'

export default function Hero({ setView }) {
    return (
        <section className="hero relative flex items-center h-screen min-h-[600px] bg-black">
            {/* Background Container - Inset card on mobile, full screen on desktop */}
            <div className="absolute inset-2 md:inset-0 rounded-[2rem] md:rounded-none overflow-hidden isolate">
                <img
                    src="/img/banner.jpg"
                    alt="Platillo del restaurante SOJA"
                    className="hero-bg absolute inset-0 w-full h-full object-cover animate-heroZoom"
                    fetchPriority="high"
                />
                {/* Overlay gradient */}
                <div className="hero-fade absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
            </div>

            <div className="hero-content relative z-10 w-full max-w-[1180px] mx-auto px-6 pt-20">
                <ScrollReveal>
                    <div className="mb-4">
                        <ShinyText
                            text="Restaurante SOJA"
                            className="kicker text-[#e5242c] uppercase tracking-[0.3em] font-extrabold text-sm md:text-base"
                            speed={3}
                        />
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1] md:leading-[1.1] mb-8 text-white drop-shadow-2xl">
                        <VariableProximity
                            label="Sabor milenario"
                            fromFontVariationSettings="'wght' 400"
                            toFontVariationSettings="'wght' 900"
                            radius={100}
                            falloff="linear"
                        /> <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#e5242c] to-[#e5242c] animate-gradient text-glow">
                            con fuego y tradicion
                        </span>
                    </h1>
                </ScrollReveal>

                <ScrollReveal delay={400}>
                    <p className="max-w-xl text-gray-200 text-lg md:text-xl mb-10 leading-relaxed drop-shadow-lg font-light">
                        Comida china en Santa Rosa de Copan con porciones generosas, servicio rapido y <span className="font-bold text-[#e5242c]">4.7 estrellas</span> de calificacion.
                    </p>
                </ScrollReveal>

                <ScrollReveal delay={600}>
                    <div className="hero-actions flex flex-col sm:flex-row gap-4">
                        <button
                            className="btn btn-primary bg-[#e5242c] text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:scale-105 hover:shadow-[0_0_30px_rgba(229,36,44,0.6)] transition-all duration-300 text-lg"
                            onClick={() => setView('order')}
                        >
                            <FaUtensils /> Ver carta completa
                        </button>
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=SOJA+Santa+Rosa+de+Copan"
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-dark bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-white/20 hover:scale-105 transition-all duration-300 text-lg"
                        >
                            <FaLocationDot /> Como llegar
                        </a>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    )
}
