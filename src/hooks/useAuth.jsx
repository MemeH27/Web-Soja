import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session)
        })

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleSession = async (session) => {
        try {
            if (session) {
                setUser(session.user)
                await fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
                setRole(null)
            }
        } catch (err) {
            console.error('Error handling auth session:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (data) {
            console.log('✅ Perfil cargado para:', data.email, '| Rol:', data.role)
            setProfile(data)
            setRole(data.role || 'user')
        }
        if (error) {
            console.error('❌ Error cargando perfil:', error.message)
            if (error.message.includes('recursion')) {
                console.error('⚠️ ALERTA: Problema de recursión en RLS. Revisa las políticas de Supabase.')
            }
            setRole('user')
        }
    }

    const updateProfile = async (updates) => {
        if (!user) return { error: new Error('No user logged in') }

        const { data, error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates, email: user.email })
            .select()
            .single()

        if (!error) {
            setProfile(data)
        }
        return { data, error }
    }

    const value = {
        user,
        profile,
        role,
        loading,
        signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        signUp: (email, password, metadata) => supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata || {}
            }
        }),
        signOut: () => supabase.auth.signOut(),
        updateProfile,
        refreshProfile: () => user && fetchProfile(user.id)
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}
