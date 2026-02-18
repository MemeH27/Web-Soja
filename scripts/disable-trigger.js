import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // I need to make sure this is available
)

async function disableTrigger() {
    console.log('Disabling push notification trigger...')
    const { data, error } = await supabase
        .from('push_dispatch_config')
        .update({ enabled: false })
        .eq('id', true)

    if (error) {
        console.error('Error disabling trigger:', error)
    } else {
        console.log('Trigger disabled successfully.')
    }
}

disableTrigger()
