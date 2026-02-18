import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useMenu() {
    const [menu, setMenu] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchMenu() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')

                if (error) throw error

                setMenu(data || [])
            } catch (err) {
                console.error('Error fetching menu:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchMenu()
    }, [])

    return { menu, loading, error, setMenu }
}
