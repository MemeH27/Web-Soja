-- Push Notifications setup (subscriptions table + RLS)
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin', 'delivery')),
  endpoint text not null,
  p256dh text,
  auth text,
  user_agent text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_enabled on public.push_subscriptions(enabled);
create unique index if not exists uq_push_subscriptions_user_endpoint
  on public.push_subscriptions(user_id, endpoint);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

-- fallback helper if it doesn't exist yet
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

drop policy if exists "push_select_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_insert_own" on public.push_subscriptions;
drop policy if exists "push_update_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_delete_self_or_admin" on public.push_subscriptions;

create policy "push_select_self_or_admin"
on public.push_subscriptions
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

create policy "push_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (
  auth.uid() = user_id
);

create policy "push_update_self_or_admin"
on public.push_subscriptions
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

create policy "push_delete_self_or_admin"
on public.push_subscriptions
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
