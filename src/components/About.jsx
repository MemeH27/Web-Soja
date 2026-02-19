import { useRef, useEffect, useState } from 'react'
import { FaCheck } from 'react-icons/fa6'
import ScrollReveal from './ScrollReveal'
import Typewriter from './Animations/Typewriter'

export default function About() {
    const [years, setYears] = useState(0)
    const [stars, setStars] = useState(0)
    const [visible, setVisible] = useState(false)
    const sectionRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                }
            },
            { threshold: 0.3 }
        )
        if (sectionRef.current) observer.observe(sectionRef.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (visible) {
            const duration = 2000
            const start = Date.now()

            const timer = setInterval(() => {
                const timePassed = Date.now() - start
                if (timePassed >= duration) {
                    setYears(5)
                    setStars(5)
                    clearInterval(timer)
                    return
                }
                // Ease out animation
                const progress = timePassed / duration
                setYears(Math.floor(progress * 5))
                setStars(Math.floor(progress * 5))
            }, 50)
            return () => clearInterval(timer)
        }
    }, [visible])

    return (
        <section id="nosotros" className="py-24 bg-black relative" ref={sectionRef}>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-[#e5242c]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-[1180px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                <ScrollReveal>
                    <div className="relative">
                        <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                            <img
                                src="/img/banner.jpg"
                                alt="Interior del restaurante SOJA"
                                className="w-full h-80 md:h-[500px] lg:h-[600px] object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Overlay Stats */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 md:p-8 pt-24">
                                <div className="flex justify-around border-t border-white/20 pt-4 md:pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl md:text-5xl font-black text-white mb-1">+{years}</p>
                                        <p className="text-gray-400 text-[10px] md:text-xs uppercase tracking-widest">Años de Experticia</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl md:text-5xl font-black text-[#e5242c] mb-1">{stars}.0</p>
                                        <p className="text-gray-400 text-[10px] md:text-xs uppercase tracking-widest">Calidad Estelar</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative border offset */}
                        <div className="absolute top-4 -right-4 w-full h-full border-2 border-[#e5242c] rounded-3xl z-0 hidden md:block" />
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                    <div>
                        <div className="mb-3">
                            <Typewriter
                                text="Nuestra Esencia"
                                className="text-[#e5242c] uppercase tracking-widest text-base md:text-sm font-bold"
                            />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
                            Mas que comida, <br /> una tradicion familiar.
                        </h2>
                        <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8 min-h-[6em]">
                            <Typewriter
                                text="En SOJA, cada platillo cuenta una historia. Desde nuestros inicios humildes hasta convertirnos en un referente en Santa Rosa de Copan, hemos mantenido intacta nuestra pasion por el autentico sabor oriental."
                                speed={15}
                                delay={500}
                            />
                        </p>

                        <ul className="space-y-4 mb-10">
                            {['Ingredientes frescos locales', 'Recetas tradicionales de familia', 'Ambiente acogedor y moderno'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-white text-lg md:text-base"> {/* Larger list items on mobile */}
                                    <span className="bg-[#e5242c] rounded-full p-1 text-xs"><FaCheck /></span>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <button className="w-full md:w-auto bg-white text-black px-8 py-4 md:py-3 rounded-full font-bold hover:bg-[#e5242c] hover:text-white transition-all duration-300 shadow-lg text-lg md:text-base">
                            Conoce Mas
                        </button>
                    </div>
                </ScrollReveal>

            </div>
        </section>
    )
}
