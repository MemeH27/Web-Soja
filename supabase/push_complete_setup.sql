-- ============================================================
-- SOJA Push Notifications — Setup Completo
-- ============================================================
-- Ejecuta este script COMPLETO en el SQL Editor de Supabase.
-- Reemplaza SOLO el valor de webhook_secret con el mismo
-- string que pusiste como PUSH_WEBHOOK_SECRET en Supabase Secrets.
-- URL del proyecto ya está pre-rellenada con tu Project Ref.
-- ============================================================

-- 1. Habilitar pg_net (para HTTP desde triggers)
create extension if not exists pg_net schema extensions;

-- 2. Crear tabla push_subscriptions si no existe
create table if not exists public.push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    endpoint    text not null,
    p256dh      text not null,
    auth        text not null,
    enabled     boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    last_seen_at timestamptz,
    unique (user_id, endpoint)
);

-- Índices para rendimiento
create index if not exists push_subs_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subs_enabled_idx on public.push_subscriptions(enabled);

-- RLS
alter table public.push_subscriptions enable row level security;

-- Limpiar políticas antiguas
drop policy if exists "push_select_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_insert_own" on public.push_subscriptions;
drop policy if exists "push_update_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_delete_self_or_admin" on public.push_subscriptions;

create policy "push_select_self_or_admin"
on public.push_subscriptions for select to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "push_insert_own"
on public.push_subscriptions for insert to authenticated
with check (auth.uid() = user_id);

create policy "push_update_self_or_admin"
on public.push_subscriptions for update to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "push_delete_self_or_admin"
on public.push_subscriptions for delete to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- 3. Crear tabla push_dispatch_config
create table if not exists public.push_dispatch_config (
    id              boolean primary key default true,
    function_url    text not null,
    webhook_secret  text not null,
    enabled         boolean not null default true,
    updated_at      timestamptz not null default now()
);

-- 4. Configurar la URL y el secret
-- ⚠️  IMPORTANTE: Cambia '1ee1c94e506ff9684a9acb21c28712f2ec75e372921193645e4d0c4454ab18359c36d26e6f2952c99e1b4602f311d08b' por el valor real
--     que pusiste como PUSH_WEBHOOK_SECRET en Supabase Dashboard -> Edge Functions -> Secrets
insert into public.push_dispatch_config (id, function_url, webhook_secret, enabled)
values (
    true,
    'https://wygxgjkhuqyjdvojkgdb.supabase.co/functions/v1/push-dispatch',
    '1ee1c94e506ff9684a9acb21c28712f2ec75e372921193645e4d0c4454ab18359c36d26e6f2952c99e1b4602f311d08b',
    true
)
on conflict (id) do update
set function_url   = excluded.function_url,
    webhook_secret = excluded.webhook_secret,
    enabled        = excluded.enabled,
    updated_at     = now();

-- 5. Función trigger que llama a la Edge Function push-dispatch
create or replace function public.dispatch_order_push_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg         record;
    req_headers jsonb;
    req_body    jsonb;
begin
    select * into cfg
    from public.push_dispatch_config
    where id = true and enabled = true
    limit 1;

    if cfg.function_url is null then
        return coalesce(new, old);
    end if;

    req_headers := jsonb_build_object(
        'Content-Type',           'application/json',
        'x-push-webhook-secret',  cfg.webhook_secret
    );

    req_body := jsonb_build_object(
        'type',       TG_OP,
        'schema',     TG_TABLE_SCHEMA,
        'table',      TG_TABLE_NAME,
        'record',     to_jsonb(new),
        'old_record', to_jsonb(old)
    );

    perform net.http_post(
        url     := cfg.function_url,
        body    := req_body,
        params  := '{}'::jsonb,
        headers := req_headers,
        timeout_milliseconds := 5000
    );

    return coalesce(new, old);
exception when others then
    -- No bloquear la transacción si el HTTP falla
    raise warning 'dispatch_order_push_event: HTTP call failed: %', sqlerrm;
    return coalesce(new, old);
end;
$$;

-- 6. Trigger en la tabla orders
drop trigger if exists trg_orders_push_dispatch on public.orders;
create trigger trg_orders_push_dispatch
after insert or update on public.orders
for each row execute function public.dispatch_order_push_event();

-- 7. Verificación: muestra la configuración actual
select
    function_url,
    left(webhook_secret, 8) || '...' as secret_preview,
    enabled,
    updated_at
from public.push_dispatch_config;
