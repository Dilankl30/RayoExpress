-- ============================================================
-- RayoExpress | Reset completo + recreación desde cero
-- ADVERTENCIA: Elimina TODOS los datos, tablas, tipos,
--              funciones, triggers y políticas en public.
-- ============================================================
-- Cómo usar:
--   1. Conéctate a tu base de datos Supabase (SQL Editor o psql)
--   2. Ejecuta este script COMPLETO (borra y recrea todo)
--   3. Luego ejecuta las migraciones en orden (abajo)
--
-- Alternativa vía psql:
--   psql "$SUPABASE_DB_URL" -f supabase/reset_and_recreate.sql
--   for f in supabase/migrations/00{1,2,3,4,5,6,7,8,9}_*.sql; do
--     psql "$SUPABASE_DB_URL" -f "$f"
--   done
-- ============================================================

begin;

-- ============================================================
-- 1. Drop ALL policies (safe dynamic loop)
-- ============================================================
do $$ declare
  pol record;
begin
  for pol in
    select policyname, tablename, schemaname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- ============================================================
-- 2. Drop ALL tables (respecting FK dependencies)
--    Orden: tablas con más dependencias primero
-- ============================================================
drop table if exists public.locations cascade;
drop table if exists public.delivery_evidence cascade;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.delivery_codes cascade;
drop table if exists public.payment_transactions cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_status_history cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.inventory cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.store_schedules cascade;
drop table if exists public.application_documents cascade;
drop table if exists public.driver_applications cascade;
drop table if exists public.store_applications cascade;
drop table if exists public.driver_documents cascade;
drop table if exists public.drivers cascade;
drop table if exists public.customers cascade;
drop table if exists public.stores cascade;
drop table if exists public.password_recovery_questions cascade;
drop table if exists public.notifications cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.app_config cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- 3. Drop ALL enum types
-- ============================================================
drop type if exists public.payment_method cascade;
drop type if exists public.order_status cascade;
drop type if exists public.app_role cascade;

-- ============================================================
-- 4. Drop ALL non-internal triggers (public schema)
-- ============================================================
do $$ declare
  trg record;
begin
  for trg in
    select tgname, relname
    from pg_trigger
    join pg_class on pg_trigger.tgrelid = pg_class.oid
    join pg_namespace on pg_class.relnamespace = pg_namespace.oid
    where not tgisinternal and nspname = 'public'
  loop
    execute format('drop trigger if exists %I on %I', trg.tgname, trg.relname);
  end loop;
end $$;

-- ============================================================
-- 5. Drop ALL functions in public schema
-- ============================================================
do $$ declare
  fn record;
begin
  for fn in
    select proname, oid
    from pg_proc
    join pg_namespace on pg_proc.pronamespace = pg_namespace.oid
    where nspname = 'public'
  loop
    execute format('drop function if exists %I cascade', fn.proname);
  end loop;
end $$;

commit;

-- ============================================================
-- 6. Ahora ejecuta las migraciones en orden
-- ============================================================
-- \i supabase/migrations/001_schema.sql    (esquema + RLS base)
-- \i supabase/migrations/002_triggers.sql  (triggers + funciones)
-- \i supabase/migrations/003_seed.sql      (datos semilla)
-- \i supabase/migrations/004_applications.sql (aplicaciones store/driver)
-- \i supabase/migrations/005_payments.sql  (payment_transactions)
-- \i supabase/migrations/006_chat.sql      (chats + mensajes)
-- \i supabase/migrations/007_rls_audit.sql (audit_log + RLS faltante)
-- \i supabase/migrations/008_fix_role_security.sql (seguridad roles)
-- \i supabase/migrations/009_security_hardening.sql (RLS completo)
-- \i supabase/migrations/010_approval_flow.sql    (aprobación store/driver + RPCs)
-- \i supabase/migrations/011_storage_rls.sql      (storage buckets + RLS + signed URLs)
