-- ============================================================
-- SOJA - Fix Bugs Principales
-- 1. Trigger profiles_guard_immutable_role_fields: permite service_role
-- 2. Política RLS orders_update_delivery_assigned: no interfiere con admin
-- 3. Columna role en push_subscriptions (si no existe)
-- 4. Reinstalar trigger de push notifications
-- ============================================================
-- Ejecuta este script en el SQL Editor de Supabase.
-- ============================================================

-- ============================================================
-- FIX 1: Trigger de perfiles — permitir service_role
-- El trigger bloqueaba la creación de repartidores desde la
-- Edge Function porque auth.uid() es NULL con service_role,
-- haciendo que is_admin(NULL) retorne false y lance excepción.
-- ============================================================
create or replace function public.profiles_guard_immutable_role_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Permitir operaciones con service_role (auth.uid() es NULL en ese contexto)
  -- Las Edge Functions con service_role son de confianza del servidor
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin(auth.uid()) then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change role';
    end if;
    if new.delivery_id_card is distinct from old.delivery_id_card then
      raise exception 'Only admins can change delivery code';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- FIX 2: Política RLS para asignación de repartidor a pedido
-- El problema: orders_update_delivery_assigned usaba
-- using (auth.uid() = delivery_id) — cuando delivery_id es NULL
-- (pedido sin repartidor aún), la condición falla para el admin.
-- La política orders_admin_all debería cubrir al admin, pero
-- para evitar conflictos, la política de repartidor excluye admins.
-- ============================================================

-- Eliminar política que puede interferir con admin
drop policy if exists "orders_update_delivery_assigned" on public.orders;

-- Recrear política solo para repartidores (no admin, el admin ya tiene orders_admin_all)
create policy "orders_update_delivery_assigned"
on public.orders
for update
to authenticated
using (
  auth.uid() = delivery_id
  and not public.is_admin(auth.uid())
)
with check (
  auth.uid() = delivery_id
  and not public.is_admin(auth.uid())
);

-- Asegurarse que orders_admin_all existe y cubre todo
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
on public.orders
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ============================================================
-- FIX 3: Columna role en push_subscriptions
-- El hook usePushNotifications guarda el campo 'role' en la
-- suscripción, pero el schema original no incluye esa columna.
-- Esto causaba que el upsert fallara silenciosamente.
-- ============================================================
alter table public.push_subscriptions
  add column if not exists role text not null default 'user';

-- Índice para buscar suscripciones por rol (útil para notificar a todos los admins)
create index if not exists push_subs_role_idx on public.push_subscriptions(role);

-- ============================================================
-- FIX 4: Reinstalar trigger de push notifications
-- Asegura que pg_net esté habilitado y el trigger esté activo.
-- ============================================================

-- Habilitar pg_net (necesario para HTTP desde triggers)
create extension if not exists pg_net schema extensions;

-- Recrear la función trigger con manejo de errores mejorado
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

-- Reinstalar el trigger
drop trigger if exists trg_orders_push_dispatch on public.orders;
create trigger trg_orders_push_dispatch
after insert or update on public.orders
for each row execute function public.dispatch_order_push_event();

-- Actualizar la configuración de push dispatch con los valores correctos
-- (ya deberían estar configurados, pero esto asegura que estén actualizados)
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

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Verificar políticas RLS
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'profiles', 'push_subscriptions')
order by tablename, policyname;

-- Verificar triggers activos
select
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('orders', 'profiles')
order by event_object_table, trigger_name;

-- Verificar configuración de push dispatch
select
    function_url,
    left(webhook_secret, 8) || '...' as secret_preview,
    enabled,
    updated_at
from public.push_dispatch_config;

-- Verificar columnas de push_subscriptions
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'push_subscriptions'
order by ordinal_position;
