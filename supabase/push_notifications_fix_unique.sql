-- Fix push_subscriptions uniqueness to allow multiple users on same device/browser.
-- Run this once in Supabase SQL Editor (for existing installations).

alter table if exists public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_key;

drop index if exists public.push_subscriptions_endpoint_key;

create unique index if not exists uq_push_subscriptions_user_endpoint
  on public.push_subscriptions(user_id, endpoint);
