import { useState, useEffect } from 'react'
import { FaBars, FaXmark, FaUtensils, FaInstagram, FaFacebookF, FaWhatsapp, FaCircleUser, FaRightFromBracket, FaShieldHalved } from 'react-icons/fa6'
import { useAuth } from '../hooks/useAuth.jsx'
import PushNotificationToggle from './PushNotificationToggle'

export default function Navbar({ setView, user, setShowAuthModal }) {
    const { profile, role, signOut } = useAuth()
    const activeRole = role || profile?.role || 'user'
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLinkClick = (target) => {
        setMobileMenuOpen(false)
        setView('home')
        if (target) {
            setTimeout(() => {
                const element = document.querySelector(target)
                if (element) element.scrollIntoView({ behavior: 'smooth' })
            }, 300)
        }
    }

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
                }`}
            style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
        >
            <div className={`max-w-[1180px] mx-auto px-6 flex justify-between items-center ${scrolled || mobileMenuOpen ? 'py-3' : 'py-5'}`}>
                <a href="#inicio" className="flex items-center gap-2 z-50 relative" onClick={() => handleLinkClick('#inicio')}>
                    <img src="/img/logo/logo_blanco.png" alt="Logo SOJA" className="h-10 md:h-12 transition-all" />
                </a>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    <a href="#inicio" onClick={() => setView('home')} className="text-white hover:text-[#e5242c] font-medium transition-colors text-sm uppercase tracking-wider">Inicio</a>
                    <a href="#destacados" onClick={() => setView('home')} className="text-white hover:text-[#e5242c] font-medium transition-colors text-sm uppercase tracking-wider">Menu</a>
                    <a href="#nosotros" onClick={() => setView('home')} className="text-white hover:text-[#e5242c] font-medium transition-colors text-sm uppercase tracking-wider">Nosotros</a>

                    {user ? (
                        <div className="flex items-center gap-3">
                            <PushNotificationToggle user={user} role={activeRole} compact />
                            <button
                                onClick={() => setView('my-orders')}
                                className="text-white hover:text-[#e5242c] font-medium transition-colors text-sm uppercase tracking-wider flex items-center gap-2"
                                title="Mis Pedidos"
                            >
                                <FaClock size={16} /> Mis Pedidos
                            </button>
                            <button
                                onClick={() => setView('profile')}
                                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all border border-white/10"
                                title="Mi Perfil"
                            >
                                <FaCircleUser size={18} className="text-[#e5242c]" />
                                <span className="max-w-[100px] truncate">{profile?.first_name || 'Perfil'}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-white hover:text-[#e5242c] font-bold text-sm uppercase tracking-wider transition-colors"
                        >
                            Ingresar
                        </button>
                    )}

                    <button
                        className="bg-[#e5242c] text-white px-5 py-2 rounded-full font-bold hover:bg-white hover:text-[#e5242c] transition-all transform hover:scale-105 shadow-lg shadow-red-900/30"
                        onClick={() => setView('order')}
                    >
                        Pedir
                    </button>
                </nav>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-white text-2xl z-50 relative focus:outline-none hover:text-[#e5242c] transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <FaXmark /> : <FaBars />}
                </button>

                {/* Mobile Nav Drawer */}
                <div
                    className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={() => setMobileMenuOpen(false)}
                />

                <div
                    className={`fixed top-0 right-0 bottom-0 w-[80%] max-w-[300px] z-[70] flex flex-col shadow-2xl border-l border-white/10 transition-transform duration-300 ease-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    style={{
                        backgroundColor: '#000000',
                        paddingTop: 'max(env(safe-area-inset-top), 0px)'
                    }}
                >
                    <div className="p-8 pt-20 flex flex-col gap-6 flex-1 bg-black relative">
                        <button
                            className="absolute top-6 right-6 text-white text-2xl hover:text-[#e5242c] transition-colors"
                            style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <FaXmark />
                        </button>
                        <a href="#inicio" onClick={() => handleLinkClick('#inicio')} className="text-xl text-white font-bold hover:text-[#e5242c] transition-colors border-b border-white/20 pb-4">Inicio</a>
                        <a href="#destacados" onClick={() => handleLinkClick('#destacados')} className="text-xl text-white font-bold hover:text-[#e5242c] transition-colors border-b border-white/20 pb-4">Menu</a>

                        {user ? (
                            <>
                                <div className="pb-4 border-b border-white/20">
                                    <PushNotificationToggle user={user} role={activeRole} />
                                </div>
                                <button
                                    onClick={() => { setView('my-orders'); setMobileMenuOpen(false); }}
                                    className="text-xl text-white font-bold hover:text-[#e5242c] transition-colors border-b border-white/20 pb-4 text-left flex items-center gap-3"
                                >
                                    <FaClock /> Mis Pedidos
                                </button>
                                <button
                                    onClick={() => { setView('profile'); setMobileMenuOpen(false); }}
                                    className="text-xl text-white font-bold hover:text-[#e5242c] transition-colors border-b border-white/20 pb-4 text-left flex items-center gap-3"
                                >
                                    <FaCircleUser /> Mi Perfil
                                </button>
                                <button
                                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                                    className="text-xl text-gray-500 font-bold hover:text-red-500 transition-colors border-b border-white/20 pb-4 text-left flex items-center gap-3"
                                >
                                    <FaRightFromBracket /> Salir
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                                className="text-xl text-white font-bold hover:text-[#e5242c] transition-colors border-b border-white/20 pb-4 text-left"
                            >
                                Ingresar
                            </button>
                        )}

                        <button
                            className="bg-[#e5242c] text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#c41e25] transition-colors mt-4 shadow-lg"
                            onClick={() => {
                                setMobileMenuOpen(false)
                                setView('order')
                            }}
                        >
                            <FaUtensils /> Ordenar Ahora
                        </button>
                    </div>

                    <div className="p-8 bg-black border-t border-white/10">
                        <div className="flex justify-center gap-6 mb-4 text-gray-400">
                            <a href="#" className="hover:text-white transition-colors"><FaInstagram size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><FaFacebookF size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><FaWhatsapp size={20} /></a>
                        </div>
                        <p className="text-center text-xs text-gray-500">© 2026 SOJA Restaurant</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
