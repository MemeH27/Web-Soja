import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, role, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse font-bold tracking-widest uppercase text-xs">Verificando Credenciales...</p>
            </div>
        )
    }

    // Si no hay usuario, mandarlo al home (el Hero)
    if (!user) {
        return <Navigate to="/" replace />
    }

    // Si hay roles permitidos y el usuario no tiene uno de ellos
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        console.warn(`⛔ Acceso denegado: Usuario con rol '${role}' intentó entrar a ruta reservada para [${allowedRoles.join(', ')}]`)
        return <Navigate to="/" replace />
    }

    return children
}
