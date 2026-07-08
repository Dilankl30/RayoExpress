-- RayoExpress | Migration 011: Storage buckets, RLS policies, and signed URL helpers
-- Creates all required buckets, sets file size limits via RLS check constraints,
-- and defines per-role access policies for storage.objects.

-- ============================================================
-- 1. Helper: check if the current user is an admin
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- 2. Helper: check if the current user is the owner of a store
-- ============================================================
create or replace function public.is_store_owner(store_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.stores where id::text = store_id and owner_id = auth.uid());
$$;

-- ============================================================
-- 3. Helper: check file size limit (max 10 MB for all uploads)
-- ============================================================
create or replace function public.storage_file_valid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bucket_id in ('product-images', 'delivery-evidence', 'receipts', 'avatars', 'driver-documents', 'application-documents') then
    if new.metadata->>'size' is not null and (new.metadata->>'size')::bigint > 10485760 then
      raise exception 'FILE_TOO_LARGE: El archivo excede el límite de 10 MB';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_file_size_on_insert on storage.objects;
create trigger check_file_size_on_insert
  before insert on storage.objects
  for each row execute function public.storage_file_valid();

-- ============================================================
-- 4. Ensure buckets exist (idempotent via insert-or-ignore)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, '{image/jpeg,image/png,image/webp}'),
  ('avatars', 'avatars', true, 2097152, '{image/jpeg,image/png,image/webp}'),
  ('delivery-evidence', 'delivery-evidence', false, 10485760, '{image/jpeg,image/png,image/webp}'),
  ('receipts', 'receipts', false, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}'),
  ('driver-documents', 'driver-documents', true, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}'),
  ('application-documents', 'application-documents', false, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}')
on conflict (id) do nothing;

-- ============================================================
-- 5. Drop all existing storage policies to recreate cleanly
-- ============================================================
do $$ declare
  pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- ============================================================
-- 6. RLS policies for storage.objects
-- ============================================================

-- 6a. product-images (PUBLIC bucket — anyone can SELECT)
create policy "product_images_select" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "product_images_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "product_images_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

-- 6b. avatars (PUBLIC bucket — anyone can SELECT)
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "avatars_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

-- 6c. delivery-evidence (PRIVATE — owner or admin)
create policy "delivery_evidence_select" on storage.objects
  for select using (
    bucket_id = 'delivery-evidence'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "delivery_evidence_insert" on storage.objects
  for insert with check (
    bucket_id = 'delivery-evidence'
    and auth.role() = 'authenticated'
  );

create policy "delivery_evidence_delete" on storage.objects
  for delete using (
    bucket_id = 'delivery-evidence'
    and public.is_admin()
  );

-- 6d. receipts (PRIVATE — owner or admin)
create policy "receipts_select" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "receipts_insert" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

create policy "receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_admin()
  );

-- 6e. driver-documents (PRIVATE — owner or admin)
create policy "driver_documents_select" on storage.objects
  for select using (
    bucket_id = 'driver-documents'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "driver_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'driver-documents'
    and auth.role() = 'authenticated'
  );

create policy "driver_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'driver-documents'
    and public.is_admin()
  );

-- 6f. application-documents (PRIVATE — owner or admin)
create policy "application_documents_select" on storage.objects
  for select using (
    bucket_id = 'application-documents'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "application_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'application-documents'
    and auth.role() = 'authenticated'
  );

create policy "application_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'application-documents'
    and public.is_admin()
  );
