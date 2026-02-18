-- RLS policies for realtime order flow (admin, customer, delivery).
-- Run this AFTER realtime_setup.sql in Supabase SQL Editor.

-- ------------------------------------------------------------------
-- 1) Helpers
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 2) Enable RLS
-- ------------------------------------------------------------------
alter table if exists public.orders enable row level security;
alter table if exists public.profiles enable row level security;

-- ------------------------------------------------------------------
-- 3) ORDERS policies
-- ------------------------------------------------------------------
drop policy if exists "orders_select_owner_delivery_admin" on public.orders;
drop policy if exists "orders_insert_any" on public.orders;
drop policy if exists "orders_update_delivery_admin" on public.orders;
drop policy if exists "orders_delete_admin_only" on public.orders;

-- Read:
-- - Customer owner
-- - Assigned delivery rider
-- - Admin
create policy "orders_select_owner_delivery_admin"
on public.orders
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = delivery_id
  or public.is_admin(auth.uid())
);

-- Insert:
-- allow guest checkout + authenticated checkout
create policy "orders_insert_any"
on public.orders
for insert
to anon, authenticated
with check (true);

-- Update:
-- assigned delivery + admin (status, assignment, etc.)
create policy "orders_update_delivery_admin"
on public.orders
for update
to authenticated
using (
  auth.uid() = delivery_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = delivery_id
  or public.is_admin(auth.uid())
);

-- Delete:
-- admin only
create policy "orders_delete_admin_only"
on public.orders
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------
-- 4) PROFILES policies
-- ------------------------------------------------------------------
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_select_delivery_public" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;

-- Read own profile + admin all
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

-- Public/guest read for delivery tracking on map.
-- Needed because OrderTracking listens to updates in profiles for delivery location.
create policy "profiles_select_delivery_public"
on public.profiles
for select
to anon, authenticated
using (role = 'delivery');

-- Update own profile + admin update any profile
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

-- ------------------------------------------------------------------
-- 5) Grants (defensive)
-- ------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.orders to anon, authenticated;
grant select, update on public.profiles to anon, authenticated;

-- ------------------------------------------------------------------
-- 6) Quick verification
-- ------------------------------------------------------------------
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'profiles')
order by tablename, policyname;
