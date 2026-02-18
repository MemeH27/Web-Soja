import { useRef, useEffect } from 'react'
import { FaStar, FaQuoteLeft } from 'react-icons/fa6'
// Removed REVIEWS import
import ScrollReveal from './ScrollReveal'
import { useReviews } from '../hooks/useReviews'

export default function Reviews() {
    const scrollRef = useRef(null)
    const { reviews, loading } = useReviews()

    // Infinite Scroll Logic (CSS animation preferred, but kept via JS for fallback or control)
    useEffect(() => {
        if (loading || reviews.length === 0) return

        const scrollContainer = scrollRef.current
        if (!scrollContainer) return

        let scrollAmount = 0
        const speed = 0.5

        const step = () => {
            if (!scrollContainer) return
            scrollAmount += speed
            scrollContainer.scrollLeft = scrollAmount

            // Reset when scrolled past half (assuming content is duplicated)
            if (scrollAmount >= scrollContainer.scrollWidth / 2) {
                scrollAmount = 0
            }
            requestAnimationFrame(step)
        }

        // Duplicate content for seamless loop is handled in rendering
        const animation = requestAnimationFrame(step)
        return () => cancelAnimationFrame(animation)
    }, [loading, reviews])

    // Create explicit duplicated array for the marquee
    const seamlessReviews = loading ? [] : [...reviews, ...reviews, ...reviews]

    if (loading) return null // Or a loading spinner

    return (
        <section id="opiniones" className="py-24 bg-[#111] overflow-hidden relative">
            <ScrollReveal>
                <div className="max-w-[1180px] mx-auto px-6 mb-16 text-center">
                    <p className="text-[#e5242c] uppercase tracking-widest text-sm font-bold mb-3">Testimonios</p>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white">Lo que dicen de nosotros</h2>
                </div>
            </ScrollReveal>

            {/* Marquee Container */}
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-hidden pb-10 select-none w-full"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
            >
                {seamlessReviews.map((review, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-[300px] md:w-[400px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 relative group hover:border-[#e5242c]/30 transition-colors"
                    >
                        <FaQuoteLeft className="absolute top-6 right-6 text-[#222] text-4xl group-hover:text-[#e5242c]/20 transition-colors" />

                        <div className="flex items-center gap-1 mb-4 text-[#FFD700]">
                            {[...Array(5)].map((_, i) => <FaStar key={i} />)}
                        </div>

                        <p className="text-gray-300 text-lg italic mb-6 leading-relaxed relative z-10">"{review.content || review.text}"</p>

                        <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e5242c] to-black flex items-center justify-center font-bold text-white">
                                {review.author[0]}
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{review.author}</h4>
                                <p className="text-xs text-gray-500">{review.meta}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
