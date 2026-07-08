-- Migration 026: Fix Catalog RLS for Store Owners

-- 1. Categories: Allow authenticated users to create categories
-- Since categories are global, we allow any authenticated user to add them.
drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.role() = 'authenticated'
  );

-- 2. Inventory: Allow store owners to insert inventory records
-- This is critical for createProduct to work as it initializes inventory.
drop policy if exists "inventory_insert_store" on public.inventory;
create policy "inventory_insert_store" on public.inventory
  for insert with check (
    exists (
      select 1 from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
