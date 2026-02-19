-- 1) Mejorar tabla de reseñas para moderación
alter table public.reviews add column if not exists published boolean default false;

-- 2) Reforzar RLS en Productos
drop policy if exists "Enable read access for all users" on public.products;
create policy "products_select_public" on public.products for select using (true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products 
for all to authenticated 
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 3) Reforzar RLS en Reseñas (Moderación)
drop policy if exists "Enable read access for all users" on public.reviews;
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews 
for select using (published = true or public.is_admin(auth.uid()));

drop policy if exists "reviews_insert_auth" on public.reviews;
create policy "reviews_insert_auth" on public.reviews 
for insert to authenticated 
with check (published = false); -- Forzar que entren como no publicadas

drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all" on public.reviews 
for all to authenticated 
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 4) Permitir cancelación por el usuario en Pedidos
drop policy if exists "orders_update_owner_cancel" on public.orders;
create policy "orders_update_owner_cancel" on public.orders
for update to authenticated
using (auth.uid() = user_id and status = 'pending') -- Solo si está pendiente
with check (status = 'cancelled'); -- Solo puede cambiar a cancelado

-- 5) Asegurar que nadie excepto Admin pueda cambiar ROLES en profiles
drop policy if exists "profiles_update_role_restriction" on public.profiles;
create policy "profiles_update_role_restriction" on public.profiles
for update to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (
  (public.is_admin(auth.uid())) -- Admin puede cambiar todo
  or 
  (auth.uid() = id and (role = (select role from public.profiles where id = auth.uid()))) -- Usuario solo puede cambiar sus datos, no su rol
);
