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

    const registerStaff = async (firstName, lastName, phone) => {
        // Generar un código de 4 dígitos único
        const code = Math.floor(1000 + Math.random() * 9000).toString()
        const email = `s${code}@soja.me`
        const password = 'deliverysoja26'

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { first_name: firstName, last_name: lastName }
            }
        })

        if (signUpError) return { error: signUpError }

        // Actualizar el perfil inmediatamente
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                role: 'delivery',
                delivery_id_card: code,
                first_name: firstName,
                last_name: lastName,
                phone: phone
            })
            .eq('id', authData.user.id)

        return { code, error: profileError }
    }

    const signInWithCode = async (code) => {
        const email = `s${code}@soja.me`
        const password = 'deliverysoja26'
        return await signIn(email, password)
    }

    const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
    const signUp = (email, password, metadata) => supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata || {}
        }
    })
    const signOut = () => supabase.auth.signOut()

    const value = {
        user,
        profile,
        role,
        loading,
        signIn,
        signInWithCode,
        signUp,
        signOut,
        updateProfile,
        registerStaff,
        refreshProfile: () => user && fetchProfile(user.id)
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}
