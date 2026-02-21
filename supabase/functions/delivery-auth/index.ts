// Supabase Edge Function for secure delivery authentication
// This runs on the server side, keeping the password secure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the secret password from environment (server-side only)
    const DELIVERY_SHARED_PASSWORD = Deno.env.get('DELIVERY_SHARED_PASSWORD')
    
    if (!DELIVERY_SHARED_PASSWORD) {
      console.error('DELIVERY_SHARED_PASSWORD not configured')
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: { code?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Cuerpo de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { code } = body
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Código de acceso requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize and validate code (4 digits only)
    const normalizedCode = code.replace(/\D/g, '').slice(0, 4)
    
    if (normalizedCode.length !== 4) {
      return new Response(
        JSON.stringify({ error: 'Código de acceso debe tener exactamente 4 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role (bypasses RLS for this function)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Build the email from the code
    const deliveryEmail = `s${normalizedCode}@soja.me`
    
    console.log(`Attempting delivery auth for code: ${normalizedCode}, email: ${deliveryEmail}`)

    // Try to sign in with the email and password
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: deliveryEmail,
      password: DELIVERY_SHARED_PASSWORD
    })

    if (signInError || !authData?.user) {
      console.error('Sign in failed:', signInError?.message)
      return new Response(
        JSON.stringify({ error: 'Código inválido o no registrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user has delivery role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name, delivery_id_card')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profileData) {
      console.error('Profile fetch failed:', profileError?.message)
      // Sign out the user since they don't have a valid profile
      await supabase.auth.admin.signOut(authData.session?.access_token || '')
      return new Response(
        JSON.stringify({ error: 'Perfil de repartidor no encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profileData.role !== 'delivery') {
      console.error('User is not a delivery person, role:', profileData.role)
      return new Response(
        JSON.stringify({ error: 'Código inválido para rol de repartidor' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Delivery auth successful for: ${profileData.first_name}`)

    // Return the session data (JWT tokens)
    return new Response(
      JSON.stringify({
        user: authData.user,
        session: authData.session,
        profile: profileData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('Unexpected error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
