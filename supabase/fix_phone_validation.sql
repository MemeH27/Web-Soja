-- ============================================================
-- SOJA - Fix Phone Validation Trigger
-- Run this in Supabase SQL Editor to fix P0001 phone error
-- ============================================================

-- Drop the old trigger that was rejecting +504XXXXXXXX format
drop trigger if exists trg_validate_order_fields on public.orders;

-- Update the validation function to accept +504XXXXXXXX format
create or replace function public.validate_order_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Validate phone number format (Honduran format)
    -- Accepts:
    --   +504XXXXXXXX  (12 chars, international format)
    --   504XXXXXXXX   (11 digits, without +)
    --   XXXXXXXX      (8 digits, local format)
    if new.client_phone is not null and new.client_phone != '' then
        if new.client_phone !~ '^\+504[0-9]{8}$' 
           and new.client_phone !~ '^504[0-9]{8}$'
           and new.client_phone !~ '^[0-9]{8}$' then
            raise exception 'Invalid phone number format. Expected +504XXXXXXXX, 504XXXXXXXX, or XXXXXXXX';
        end if;
    end if;

    -- Validate client name (must have at least 2 chars)
    if new.client_name is not null and length(trim(new.client_name)) < 2 then
        raise exception 'Client name too short';
    end if;

    -- Validate total is not negative
    if new.total is not null and new.total < 0 then
        raise exception 'Total cannot be negative';
    end if;

    return new;
end;
$$;

-- Re-apply the trigger
create trigger trg_validate_order_fields
before insert or update on public.orders
for each row execute function public.validate_order_fields();

-- Verify the trigger was created
select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_table = 'orders'
  and trigger_schema = 'public';
