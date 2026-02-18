import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase URL or Anon Key missing in .env') // Fixed typo
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkConnection() {
    console.log('Checking connection to Supabase...')
    const { data, error } = await supabase.from('products').select('*').limit(1)

    if (error) {
        console.error('Connection Error:', error.message)
        if (error.code === '42P01') {
            console.log('Table "products" does not exist. Need to run migrations.')
        }
    } else {
        console.log('Connection Successful! products table exists.')
        console.log('Data sample:', data)
    }
}

checkConnection()
