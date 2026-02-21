-- ============================================================
-- SOJA - Security Hardening (RLS + Guards + Least Privilege)
-- Run in Supabase SQL Editor after base schema is created.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Helper functions
-- ------------------------------------------------------------
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

create or replace function public.is_delivery(uid uuid)
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
      and p.role = 'delivery'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_delivery(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_delivery(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Role/identity hardening on profiles
-- ------------------------------------------------------------
create or replace function public.profiles_guard_immutable_role_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists trg_profiles_guard_immutable_role_fields on public.profiles;
create trigger trg_profiles_guard_immutable_role_fields
before update on public.profiles
for each row execute function public.profiles_guard_immutable_role_fields();

-- ------------------------------------------------------------
-- 3) Basic order integrity guard
-- ------------------------------------------------------------
create or replace function public.orders_guard_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.client_name, '') = '' then
      raise exception 'client_name is required';
    end if;
    if coalesce(new.client_phone, '') = '' then
      raise exception 'client_phone is required';
    end if;
    if new.total is null or new.total < 0 then
      raise exception 'invalid total';
    end if;
    if new.status is distinct from 'pending' then
      raise exception 'new orders must start as pending';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if not public.is_admin(auth.uid()) then
      if old.user_id = auth.uid() then
        if not (old.status = 'pending' and new.status = 'cancelled') then
          raise exception 'customers can only cancel pending orders';
        end if;
      elsif old.delivery_id = auth.uid() then
        if not (
          (old.status = 'prepared' and new.status = 'shipped')
          or (old.status = 'shipped' and new.status = 'delivered')
        ) then
          raise exception 'invalid status transition for delivery role';
        end if;
      else
        raise exception 'forbidden order update';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_guard_integrity on public.orders;
create trigger trg_orders_guard_integrity
before insert or update on public.orders
for each row execute function public.orders_guard_integrity();

-- ------------------------------------------------------------
-- 4) Enable RLS
-- ------------------------------------------------------------
alter table if exists public.orders enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.push_subscriptions enable row level security;
alter table if exists public.push_dispatch_config enable row level security;

-- ------------------------------------------------------------
-- 5) Drop old/conflicting policies
-- ------------------------------------------------------------
drop policy if exists "orders_select_owner_delivery_admin" on public.orders;
drop policy if exists "orders_insert_any" on public.orders;
drop policy if exists "orders_update_delivery_admin" on public.orders;
drop policy if exists "orders_delete_admin_only" on public.orders;
drop policy if exists "orders_update_owner_cancel" on public.orders;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_select_delivery_assigned" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_role_restriction" on public.profiles;

drop policy if exists "products_select_public" on public.products;
drop policy if exists "products_admin_all" on public.products;

drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_insert_auth" on public.reviews;
drop policy if exists "reviews_admin_all" on public.reviews;

drop policy if exists "push_select_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_insert_own" on public.push_subscriptions;
drop policy if exists "push_update_self_or_admin" on public.push_subscriptions;
drop policy if exists "push_delete_self_or_admin" on public.push_subscriptions;

-- ------------------------------------------------------------
-- 6) ORDERS policies
-- ------------------------------------------------------------
create policy "orders_select_owner_delivery_admin"
on public.orders
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = delivery_id
  or public.is_admin(auth.uid())
);

create policy "orders_insert_checkout"
on public.orders
for insert
to anon, authenticated
with check (
  status = 'pending'
  and delivery_id is null
  and (
    user_id is null
    or user_id = auth.uid()
  )
);

create policy "orders_update_owner_cancel"
on public.orders
for update
to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'cancelled');

create policy "orders_update_delivery_assigned"
on public.orders
for update
to authenticated
using (auth.uid() = delivery_id)
with check (auth.uid() = delivery_id);

create policy "orders_admin_all"
on public.orders
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 7) PROFILES policies
-- ------------------------------------------------------------
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

create policy "profiles_select_delivery_assigned"
on public.profiles
for select
to authenticated
using (
  role = 'delivery'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.orders o
      where o.delivery_id = public.profiles.id
        and o.user_id = auth.uid()
        and o.status in ('prepared', 'shipped')
    )
  )
);

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

-- ------------------------------------------------------------
-- 8) PRODUCTS and REVIEWS policies
-- ------------------------------------------------------------
create policy "products_select_public"
on public.products
for select
using (true);

create policy "products_admin_all"
on public.products
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

alter table public.reviews add column if not exists published boolean default false;

create policy "reviews_select_public"
on public.reviews
for select
using (published = true or public.is_admin(auth.uid()));

create policy "reviews_insert_auth"
on public.reviews
for insert
to authenticated
with check (
  published = false
  and auth.uid() is not null
);

create policy "reviews_admin_all"
on public.reviews
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 9) PUSH SUBSCRIPTIONS policies
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 10) PUSH DISPATCH CONFIG (admin only via SQL UI/service role)
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'push_dispatch_config'
  ) then
    execute 'drop policy if exists "push_dispatch_config_admin_only" on public.push_dispatch_config';
    execute '
      create policy "push_dispatch_config_admin_only"
      on public.push_dispatch_config
      for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()))
    ';
  end if;
end $$;

-- ------------------------------------------------------------
-- 11) Grants (defensive)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.orders to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.products to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ------------------------------------------------------------
-- 12) Verification
-- ------------------------------------------------------------
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'profiles', 'products', 'reviews', 'push_subscriptions', 'push_dispatch_config')
order by tablename, policyname;
