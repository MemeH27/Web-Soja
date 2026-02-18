import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useMenu({ adminMode = false } = {}) {
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

                const allProducts = data || []
                // In admin mode, show all products. In customer mode, filter out unavailable ones.
                setMenu(adminMode ? allProducts : allProducts.filter(p => p.available !== false))
            } catch (err) {
                console.error('Error fetching menu:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchMenu()
    }, [adminMode])

    return { menu, loading, error, setMenu }
}
