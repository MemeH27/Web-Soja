-- ============================================================
-- SOJA - Setup Supabase Storage for Product Images
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create the products storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'products',
    'products',
    true,  -- Public bucket so images are accessible without auth
    5242880,  -- 5MB max file size
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing storage policies to avoid conflicts
drop policy if exists "products_images_public_read" on storage.objects;
drop policy if exists "products_images_admin_upload" on storage.objects;
drop policy if exists "products_images_admin_delete" on storage.objects;

-- Allow public read access to product images
create policy "products_images_public_read"
on storage.objects
for select
using (bucket_id = 'products');

-- Allow authenticated admins to upload product images
create policy "products_images_admin_upload"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'products'
    and (
        -- Allow admins
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    )
);

-- Allow authenticated admins to update product images
create policy "products_images_admin_update"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'products'
    and exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);

-- Allow authenticated admins to delete product images
create policy "products_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'products'
    and exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);

-- Verify the bucket was created
select id, name, public, file_size_limit
from storage.buckets
where id = 'products';
