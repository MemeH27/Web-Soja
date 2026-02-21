import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado: falta header Authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const deliverySharedPassword = Deno.env.get('DELIVERY_SHARED_PASSWORD') || ''

    // Diagnostic logging - this will show up in Supabase logs
    console.log('--- Edge Function: create-delivery-user Diagnostic ---')
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING')
    console.log('SUPABASE_ANON_KEY:', anonKey ? 'Set' : 'MISSING')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Set' : 'MISSING')
    console.log('DELIVERY_SHARED_PASSWORD:', deliverySharedPassword ? `Set (Length: ${deliverySharedPassword.length})` : 'MISSING')
    console.log('------------------------------------------------------')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta. SUPABASE_URL, ANON_KEY o SERVICE_ROLE_KEY faltan.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!deliverySharedPassword) {
      return new Response(
        JSON.stringify({
          error: 'DELIVERY_SHARED_PASSWORD no encontrado en Supabase Secrets.',
          hint: 'Asegúrate de haber guardado el secret con el nombre EXACTO: DELIVERY_SHARED_PASSWORD'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client using the caller's JWT to validate their identity
    const supabaseCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    const { data: callerData, error: authError } = await supabaseCaller.auth.getUser()
    const callerUser = callerData?.user
    if (authError || !callerUser) {
      console.error('Auth check error:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Sesión inválida o expirada. Por favor, recarga la página.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify caller is an admin
    const { data: callerProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle()

    if (profileCheckError) {
      console.error('Admin verification error:', profileCheckError.message)
      return new Response(
        JSON.stringify({ error: 'Error verificando permisos de administrador: ' + profileCheckError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos suficientes para realizar esta acción.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Request body
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Formato de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { code, email, firstName, lastName, phone } = body
    if (!code || !email || !firstName) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos: código, email y nombre.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code is used
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('delivery_id_card', String(code))
      .maybeSingle()

    if (existingErr) throw existingErr
    if (existing) {
      return new Response(
        JSON.stringify({ error: `El código ${code} ya lo tiene otro repartidor.` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: String(email),
      password: deliverySharedPassword,
      email_confirm: true,
      user_metadata: {
        first_name: String(firstName),
        last_name: String(lastName || ''),
        phone: String(phone || ''),
        role: 'delivery',
      },
    })

    if (createError || !created?.user) {
      console.error('Auth creation error:', createError?.message)
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario en Supabase Auth: ' + (createError?.message || 'Error desconocido') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sync profile
    const { error: syncError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        email: String(email),
        first_name: String(firstName),
        last_name: String(lastName || ''),
        phone: String(phone || ''),
        role: 'delivery',
        delivery_id_card: String(code),
      })

    if (syncError) {
      console.error('Profile sync error (rolling back):', syncError.message)
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return new Response(
        JSON.stringify({ error: 'Error creando perfil de base de datos: ' + syncError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: created.user.id, code: String(code) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Unexpected error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message || 'Error inesperado en el servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
