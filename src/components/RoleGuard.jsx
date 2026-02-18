import React from 'react'

export default function RoleGuard({ children, requiredRole, user, role, loading }) {
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse font-bold tracking-widest uppercase text-xs">Verificando Credenciales...</p>
            </div>
        )
    }

    // Permisos para repartidor
    if (requiredRole === 'delivery') {
        // El panel de delivery maneja su propio flujo de login si no hay usuario
        return children
    }

    // Permisos para administrador
    if (requiredRole === 'admin') {
        if (!user || role !== 'admin') {
            console.warn(`⛔ Acceso denegado: rol '${role}' intentó acceder al panel de admin`)
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
                    <div className="text-6xl">🔒</div>
                    <h1 className="text-2xl font-black uppercase tracking-widest">Acceso Denegado</h1>
                    <p className="text-gray-500 text-sm">No tienes permisos para ver esta sección.</p>
                </div>
            )
        }
        return children
    }

    return children
}
