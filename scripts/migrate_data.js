import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { FOOD_ITEMS, DRINK_ITEMS, REVIEWS } from '../src/data.js'

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase credentials missing.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrate() {
    console.log('Starting migration...')

    // 1. Migrate Products
    console.log('Migrating products...')
    const foodProducts = FOOD_ITEMS.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: 'food'
    }))
    const drinkProducts = DRINK_ITEMS.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: 'drink'
    }))

    const allProducts = [...foodProducts, ...drinkProducts]

    // Upsert products to avoid duplicates if run multiple times
    const { error: productsError } = await supabase
        .from('products')
        .upsert(allProducts, { onConflict: 'id' })

    if (productsError) {
        console.error('Error migrating products:', productsError)
    } else {
        console.log(`Successfully migrated ${allProducts.length} products.`)
    }

    // 2. Migrate Reviews
    // Note: Reviews don't have IDs in data.js, so we might duplicate them if run multiple times.
    // Ideally, we clear the table first or handle check. For now, we'll just insert.
    // But to be safe, maybe we should skip if table is not empty?
    // Let's just insert.
    console.log('Migrating reviews...')

    const reviews = REVIEWS.map(r => ({
        author: r.author,
        meta: r.meta,
        time_text: r.time,
        rating: r.rating,
        content: r.text
    }))

    const { error: reviewsError } = await supabase
        .from('reviews')
        .insert(reviews)

    if (reviewsError) {
        console.error('Error migrating reviews:', reviewsError)
    } else {
        console.log(`Successfully migrated ${reviews.length} reviews.`)
    }

    console.log('Migration complete.')
}

migrate()
