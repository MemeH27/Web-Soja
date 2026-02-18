-- ============================================================
-- SOJA Push Notifications — Configuración de push_dispatch_config
-- Ejecutar en Supabase SQL Editor DESPUÉS de push_dispatch_trigger.sql
-- ============================================================

-- Habilitar pg_net si no está habilitada
create extension if not exists pg_net schema extensions;

-- Insertar/actualizar la configuración del dispatcher
insert into public.push_dispatch_config (id, function_url, webhook_secret, enabled)
values (
  true,
  'https://wygxgjkhuqyjdvojkgdb.functions.supabase.co/push-dispatch',
  'soja_push_wh_2024_xK9mP3qR7vZ2nL',
  true
)
on conflict (id) do update
set function_url    = excluded.function_url,
    webhook_secret  = excluded.webhook_secret,
    enabled         = excluded.enabled,
    updated_at      = now();

-- Verificar que quedó guardado
select id, function_url, webhook_secret, enabled, updated_at
from public.push_dispatch_config;
