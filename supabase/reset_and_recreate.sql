-- RayoExpress | Reset completo + recreación
-- ADVERTENCIA: Elimina TODOS los datos y objetos.

begin;

-- Drop all policies (safe order)
do $$ declare
  pol record;
begin
  for pol in select policyname, tablename, schemaname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Drop all tables (order by dependencies)
drop table if exists public.locations cascade;
drop table if exists public.delivery_evidence cascade;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.delivery_codes cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_status_history cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.inventory cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.store_schedules cascade;
drop table if exists public.driver_documents cascade;
drop table if exists public.drivers cascade;
drop table if exists public.customers cascade;
drop table if exists public.stores cascade;
drop table if exists public.password_recovery_questions cascade;
drop table if exists public.profiles cascade;

-- Drop enums
drop type if exists public.payment_method cascade;
drop type if exists public.order_status cascade;
drop type if exists public.app_role cascade;

-- Drop triggers
do $$ declare
  trg record;
begin
  for trg in select tgname, relname from pg_trigger join pg_class on pg_trigger.tgrelid = pg_class.oid where not tgisinternal loop
    execute format('drop trigger if exists %I on %I', trg.tgname, trg.relname);
  end loop;
end $$;

-- Drop functions
do $$ declare
  fn record;
begin
  for fn in select proname, oid from pg_proc join pg_namespace on pg_proc.pronamespace = pg_namespace.oid where nspname = 'public' loop
    execute format('drop function if exists %I cascade', fn.proname);
  end loop;
end $$;

commit;

-- Now run migrations in order:
-- \i supabase/migrations/001_schema.sql
-- \i supabase/migrations/002_triggers.sql
-- \i supabase/migrations/003_seed.sql
