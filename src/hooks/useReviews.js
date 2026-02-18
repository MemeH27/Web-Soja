import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useReviews() {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchReviews() {
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('*')

                if (error) throw error

                setReviews(data || [])
            } catch (err) {
                console.error('Error fetching reviews:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchReviews()
    }, [])

    return { reviews, loading, error, setReviews }
}
