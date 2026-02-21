-- ============================================================
-- SOJA - Add cancel_reason column to orders table
-- Run this in Supabase SQL Editor to fix PGRST204 error
-- ============================================================

-- Add cancel_reason column if it doesn't exist
alter table public.orders 
add column if not exists cancel_reason text;

-- Add a comment for documentation
comment on column public.orders.cancel_reason is 
'Reason provided by customer or admin when cancelling an order';

-- Verify the column was added
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name = 'cancel_reason';
