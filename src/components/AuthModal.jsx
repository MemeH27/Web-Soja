import { useState, useEffect } from 'react'
import { FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaTimes, FaPhone, FaUser, FaMapMarkerAlt, FaArrowRight, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../supabaseClient'
import LocationPicker from './LocationPicker'

export default function AuthModal({ isOpen, onClose }) {
    if (!isOpen) return null

    const [isLogin, setIsLogin] = useState(true)
    const [step, setStep] = useState(1) // 1: Login/Signup credentials, 2: Address & Map
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')

    // Address fields
    const [city, setCity] = useState('Santa Rosa de Copán')
    const [neighborhood, setNeighborhood] = useState('')
    const [street, setStreet] = useState('')
    const [neighborhoodSuggestions, setNeighborhoodSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    const [location, setLocation] = useState(null)
    const [showMap, setShowMap] = useState(false)

    const neighborhoods = [
        "El Carmen", "El Progreso", "San Martín", "Mercedes", "Santa Teresa",
        "Díaz Valenzuela", "Miraflores", "Dolores", "Los Ángeles", "El Calvario",
        "Figueroa", "Mejía García", "Prado Alto", "Santa Eduviges", "El Bosque",
        "Los Maestros", "Buenos Aires", "Bella Vista", "San José", "Centenario",
        "Álvaro", "Osorio", "Los Pinares", "La Sabana", "Capítulo de Abogados",
        "Divina Providencia", "Los Llanos", "Flores-Saavedra", "Santa Rosa",
        "Loma Linda", "Contreras", "Alpes de Edén", "Los Naranjos", "Santa Fé", "Villa Belén"
    ]

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { signIn, signUp, updateProfile, user } = useAuth()

    // Auto-hide error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isLogin) {
                const { error } = await signIn(email, password)
                if (error) {
                    // Specific mapping for login errors
                    if (error.message === 'Invalid login credentials') {
                        throw new Error('Correo o contraseña incorrectos')
                    }
                    if (error.message === 'Email not confirmed') {
                        throw new Error('Por favor, confirma tu correo electrónico')
                    }
                    throw error
                }
                onClose()
            } else {
                // Validation for signup
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden')
                }
                if (password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres')
                }

                const metadata = {
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone
                }

                const { data, error } = await signUp(email, password, metadata)
                if (error) {
                    if (error.message.includes('User already registered')) {
                        throw new Error('Este correo ya está registrado. Intenta iniciar sesión.')
                    }
                    throw error
                }

                if (data.user && !data.session) {
                    // This means email confirmation is required!
                    setError('¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta y así poder guardar tu dirección de entrega.')
                    // We DO NOT move to step 2 yet.
                } else {
                    // Move to next step (Location)
                    setStep(2)
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleProfileSubmit = async (e) => {
        e.preventDefault()

        if (city.trim().toLowerCase() !== 'santa rosa de copán' && city.trim().toLowerCase() !== 'santa rosa') {
            setError('Actualmente solo contamos con restaurantes en Santa Rosa de Copán')
            return
        }

        if (!location) {
            setError('Por favor, fija tu ubicación exacta en el mapa antes de continuar')
            return
        }

        setLoading(true)
        try {
            if (!user) {
                // If user is null, it might be due to email confirmation or delay
                // Since metadata was sent in signup, we can try to proceed if we have a session
                // But updateProfile needs a user. Let's try to get current user again.
                const { data: { user: currentUser } } = await supabase.auth.getUser()
                if (!currentUser) {
                    throw new Error('Para completar el registro, asegúrate de haber confirmado tu correo si fue solicitado, o intenta ingresar nuevamente.')
                }
            }

            const fullAddress = `${street}, ${neighborhood}, ${city}`
            const { error } = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                address: fullAddress,
                location: location
            })
            if (error) throw error
            setStep(3) // Move to success message
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetFields = () => {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setFirstName('')
        setLastName('')
        setPhone('')
        setCity('Santa Rosa de Copán')
        setNeighborhood('')
        setStreet('')
        setNeighborhoodSuggestions([])
        setShowSuggestions(false)
        setLocation(null)
        setStep(1)
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999] flex items-center justify-center p-4 sm:p-0 overflow-y-auto">
            <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[2.5rem] relative shadow-2xl animate-in fade-in zoom-in duration-300 my-8">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
                >
                    <FaTimes size={24} />
                </button>

                <div className="p-8 sm:p-12">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-block p-4 rounded-3xl bg-[#e5242c]/10 mb-4">
                            <img className="h-8" src="/img/logo/logo_blanco.png" alt="SOJA" />
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-white mb-2">
                            {step === 1 ? (isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta') :
                                step === 2 ? 'Guarda tu ubicación para tus pedidos' :
                                    '¡Registro Completado!'}
                        </h2>
                        <div className="flex justify-center gap-2 mt-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#e5242c]' : 'w-2 bg-white/10'}`}></div>
                            ))}
                        </div>
                    </div>

                    {step === 1 && (
                        <>
                            <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
                                <button
                                    onClick={() => { setIsLogin(true); resetFields(); }}
                                    className={`flex-1 py-3 font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => { setIsLogin(false); resetFields(); }}
                                    className={`flex-1 py-3 font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                                >
                                    Registro
                                </button>
                            </div>

                            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                                {!isLogin && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative group">
                                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    placeholder="Nombre"
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                                    required={!isLogin}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    placeholder="Apellido"
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                                    required={!isLogin}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="relative group">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Correo electrónico"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Contraseña"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    {!isLogin && (
                                        <div className="relative group">
                                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirmar contraseña"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                {!isLogin && (
                                    <div className="relative group">
                                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Número de teléfono"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                            required={!isLogin}
                                        />
                                    </div>
                                )}

                                {error && <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-4 rounded-xl">{error}</div>}

                                <button
                                    disabled={loading}
                                    className="w-full bg-[#e5242c] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#c41e25] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarse y Continuar')}
                                    {!loading && <FaArrowRight />}
                                </button>

                                <div className="mt-8 text-center">
                                    <button
                                        type="button"
                                        onClick={() => { setIsLogin(!isLogin); resetFields(); }}
                                        className="text-gray-500 hover:text-white text-sm transition-colors group"
                                    >
                                        {isLogin ? (
                                            <>¿No tienes cuenta? <span className="text-[#e5242c] font-bold border-b border-[#e5242c]/0 group-hover:border-[#e5242c] transition-all">Crea una aquí</span></>
                                        ) : (
                                            <>¿Ya tienes cuenta? <span className="text-[#e5242c] font-bold border-b border-[#e5242c]/0 group-hover:border-[#e5242c] transition-all">Inicia sesión</span></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleProfileSubmit} className="space-y-4 animate-in slide-in-from-right duration-500">
                            {/* City */}
                            <div className="relative group">
                                <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={city}
                                    readOnly
                                    placeholder="Ciudad"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-gray-500 cursor-not-allowed outline-none transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-gray-600 font-bold">Bloqueado</span>
                            </div>

                            {/* Neighborhood with Custom Autocomplete */}
                            <div className="relative">
                                <div className="relative group">
                                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        value={neighborhood}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNeighborhood(val);
                                            if (val.trim().length > 0) {
                                                const filtered = neighborhoods.filter(n =>
                                                    n.toLowerCase().includes(val.toLowerCase())
                                                ).slice(0, 5);
                                                setNeighborhoodSuggestions(filtered);
                                                setShowSuggestions(true);
                                            } else {
                                                setNeighborhoodSuggestions([]);
                                                setShowSuggestions(false);
                                            }
                                        }}
                                        onFocus={() => neighborhood.trim().length > 0 && setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Barrio o Colonia"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                        required
                                    />
                                </div>

                                {showSuggestions && neighborhoodSuggestions.length > 0 && (
                                    <div className="absolute z-20 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                        {neighborhoodSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => {
                                                    setNeighborhood(suggestion);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full px-6 py-4 text-left text-gray-300 hover:bg-[#e5242c]/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Street / Details */}
                            <div className="relative group">
                                <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    placeholder="Calle y Domicilio (Ej: Calle Real, Casa #123)"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#e5242c]/50 outline-none transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowMap(true)}
                                className={`w-full py-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${location ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                            >
                                {location ? <FaCheckCircle /> : <FaMapMarkerAlt />}
                                {location ? 'Ubicación GPS confirmada' : 'Fijar ubicación exacta en el mapa'}
                            </button>

                            {error && <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-4 rounded-xl">{error}</div>}

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-6 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    <FaArrowLeft />
                                </button>
                                <button
                                    disabled={loading || !location}
                                    className="flex-1 bg-[#e5242c] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#c41e25] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Finalizar Registro'}
                                    <FaCheckCircle />
                                </button>
                            </div>
                        </form>
                    )}
                    {step === 3 && (
                        <div className="text-center space-y-6 animate-in zoom-in duration-500">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-500 mb-2">
                                <FaCheckCircle size={40} />
                            </div>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                Sus datos se guardaron con éxito y se usarán para sus próximos pedidos.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full bg-[#e5242c] text-white py-5 rounded-2xl font-bold hover:bg-[#c41e25] transition-all"
                            >
                                ¡Comenzar ahora!
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showMap && (
                <LocationPicker
                    location={location}
                    setLocation={setLocation}
                    onClose={() => setShowMap(false)}
                />
            )}
        </div>
    )
}
