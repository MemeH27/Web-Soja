import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useFeatured() {
    const [featuredItems, setFeaturedItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchFeatured() {
            try {
                // In a professional setup, we would have a 'featured' column.
                // For now, we'll fetch products that are in the featured list.
                // But since we want an admin panel, let's fetch all and we can filter,
                // or better, fetch all and the admin panel can eventually toggle a flag.

                // For now, let's fetch products. We'll use the IDs from data.js as a fallback
                // but ideally we transition to a column.

                const { data, error } = await supabase
                    .from('products')
                    .select('*')

                if (error) throw error

                // In the future, this would be .eq('featured', true)
                // For now, we manually filter or just return all and let component decide.
                // Let's filter here to keep the hook focused.
                const ids = ['arrozfrito', 'sopawantan', 'camaronesempanizados', 'pollonaranja', 'tacoschinos']
                const featured = data?.filter(item => ids.includes(item.id)) || []

                setFeaturedItems(featured)
            } catch (err) {
                console.error('Error fetching featured products:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchFeatured()
    }, [])

    return { featuredItems, loading, error }
}
