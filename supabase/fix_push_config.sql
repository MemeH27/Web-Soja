-- ============================================================
-- SOJA Push Notifications — Configurar push_dispatch_config
-- ============================================================
-- INSTRUCCIONES:
-- 1. Reemplaza YOUR_PROJECT_REF con tu Project Reference (ej: wygxgjkhuqyjdvojkgdb)
-- 2. Reemplaza YOUR_WEBHOOK_SECRET con el mismo valor de PUSH_WEBHOOK_SECRET en tus Supabase Secrets
-- 3. Ejecuta en Supabase SQL Editor
-- ============================================================

-- Asegurar que pg_net está habilitado
create extension if not exists pg_net schema extensions;

-- Insertar/actualizar la configuración del dispatcher
-- CAMBIA los valores de abajo antes de ejecutar:
insert into public.push_dispatch_config (id, function_url, webhook_secret, enabled)
values (
  true,
  'https://wygxgjkhuqyjdvojkgdb.supabase.co/functions/v1/push-dispatch',
  '1ee1c94e506ff9684a9acb21c28712f2ec75e372921193645e4d0c4454ab18359c36d26e6f2952c99e1b4602f311d08b',
  true
)
on conflict (id) do update
set function_url    = excluded.function_url,
    webhook_secret  = excluded.webhook_secret,
    enabled         = excluded.enabled,
    updated_at      = now();

-- Verificar que quedó guardado
select id, function_url, left(webhook_secret, 10) || '...' as webhook_secret_preview, enabled, updated_at
from public.push_dispatch_config;
