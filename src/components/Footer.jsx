import { FaInstagram, FaFacebookF, FaWhatsapp, FaPhone, FaLocationDot } from 'react-icons/fa6'
import ScrollReveal from './ScrollReveal'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Footer({ setView }) {
    const { role } = useAuth()
    return (
        <footer id="footer" className="footer bg-[#0a0a0a] border-t border-white/5 pt-20 pb-10 px-6">
            <div className="max-w-[1180px] mx-auto">
                <ScrollReveal>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        <article className="col-span-1 lg:col-span-1">
                            <img className="h-12 mb-6 opacity-90" src="/img/logo/logo_blanco.png" alt="SOJA" />
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Llevando el autentico sabor oriental a cada rincon de Santa Rosa de Copan con pasion y tradicion.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#e5242c] transition-colors"><FaInstagram /></a>
                                <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#1877f2] transition-colors"><FaFacebookF /></a>
                                <a href="#" aria-label="WhatsApp" className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#25D366] transition-colors"><FaWhatsapp /></a>
                            </div>
                        </article>

                        <article>
                            <h4 className="text-white font-bold text-lg mb-6">Horarios</h4>
                            <ul className="space-y-3 text-gray-400 text-sm">
                                <li className="flex justify-between border-b border-white/5 pb-2">
                                    <span>Lunes - Jueves</span>
                                    <span>10:00 - 20:00</span>
                                </li>
                                <li className="flex justify-between border-b border-white/5 pb-2">
                                    <span>Viernes - Domingo</span>
                                    <span>10:00 - 21:00</span>
                                </li>
                            </ul>
                        </article>

                        <article>
                            <h4 className="text-white font-bold text-lg mb-6">Contacto</h4>
                            <ul className="space-y-4 text-gray-400 text-sm">
                                <li className="flex items-start gap-3">
                                    <FaPhone className="text-[#e5242c] mt-1" />
                                    <a href="tel:+50499321163" className="hover:text-white transition-colors">+504 9932-1163</a>
                                </li>
                                <li className="flex items-start gap-3">
                                    <FaLocationDot className="text-[#e5242c] mt-1" />
                                    <span>Barrio El Centro, 2 cuadras al sur del parque central, Santa Rosa de Copan.</span>
                                </li>
                            </ul>
                        </article>

                        <article>
                            <h4 className="text-white font-bold text-lg mb-6">Enlaces Rapidos</h4>
                            <ul className="space-y-3 text-gray-400 text-sm">
                                <li><a href="#inicio" className="hover:text-[#e5242c] transition-colors">Inicio</a></li>
                                <li><a href="#destacados" className="hover:text-[#e5242c] transition-colors">Menú</a></li>
                                <li><a href="#nosotros" className="hover:text-[#e5242c] transition-colors">Nosotros</a></li>
                                <li><a href="#opiniones" className="hover:text-[#e5242c] transition-colors">Reseñas</a></li>
                            </ul>
                        </article>
                    </div>
                </ScrollReveal>

                <div className="border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-600 text-xs">© 2026 SOJA Comida China. Todos los derechos reservados.</p>
                    <div className="flex gap-6 text-gray-600 text-xs">
                        <a href="#" className="hover:text-gray-400">Privacidad</a>
                        <a href="#" className="hover:text-gray-400">Terminos</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
