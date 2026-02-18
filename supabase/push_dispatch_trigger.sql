-- Trigger that calls Edge Function push-dispatch for order changes.
-- Run AFTER push_notifications_setup.sql and AFTER deploying the edge function.

create extension if not exists pg_net schema extensions;

create table if not exists public.push_dispatch_config (
  id boolean primary key default true,
  function_url text not null,
  webhook_secret text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.set_push_dispatch_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_dispatch_config_updated_at on public.push_dispatch_config;
create trigger trg_push_dispatch_config_updated_at
before update on public.push_dispatch_config
for each row execute function public.set_push_dispatch_config_updated_at();

-- Example seed (replace values with your project values before running):
-- insert into public.push_dispatch_config (id, function_url, webhook_secret, enabled)
-- values (
--   true,
--   'https://YOUR_PROJECT_REF.functions.supabase.co/push-dispatch',
--   'YOUR_LONG_RANDOM_SECRET',
--   true
-- )
-- on conflict (id) do update
-- set function_url = excluded.function_url,
--     webhook_secret = excluded.webhook_secret,
--     enabled = excluded.enabled;

create or replace function public.dispatch_order_push_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  req_headers jsonb;
  req_body jsonb;
begin
  select *
  into cfg
  from public.push_dispatch_config
  where id = true
    and enabled = true
  limit 1;

  if cfg.function_url is null then
    return coalesce(new, old);
  end if;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-push-webhook-secret', cfg.webhook_secret
  );

  req_body := jsonb_build_object(
    'type', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(new),
    'old_record', to_jsonb(old)
  );

  perform net.http_post(
    cfg.function_url,
    req_body,
    '{}'::jsonb,
    req_headers,
    5000
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_orders_push_dispatch on public.orders;
create trigger trg_orders_push_dispatch
after insert or update on public.orders
for each row execute function public.dispatch_order_push_event();
