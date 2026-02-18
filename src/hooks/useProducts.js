import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchProducts() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')

                if (error) throw error

                setProducts(data || [])
            } catch (err) {
                console.error('Error fetching products:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [])

    return { products, loading, error }
}
