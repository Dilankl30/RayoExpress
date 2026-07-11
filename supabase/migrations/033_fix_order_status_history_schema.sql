-- Fix order_status_history table schema mismatch
-- Migration 023 changed the trigger to use from_status/to_status columns
-- but never altered the table. This migration fixes that.

-- Step 1: Add the new columns if they don't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_status_history'
      and column_name = 'from_status'
  ) then
    alter table public.order_status_history
      add column from_status text,
      add column to_status text;

    -- Backfill: copy existing 'status' values to 'to_status'
    update public.order_status_history
    set to_status = status::text
    where to_status is null;
  end if;
end $$;

-- Step 2: Fix the trigger function to be safe for both old and new schema
-- Uses from_status/to_status (new columns) and keeps backward compat
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, from_status, to_status, changed_by)
    values (old.id, new.status, old.status::text, new.status::text, auth.uid());
  end if;
  return new;
end;
$$;
