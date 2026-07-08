-- Migration 014: Fix critical RLS, constraint, and state machine issues

-- ============================================================
-- BUG 1: Enable RLS on delivery_codes and store_schedules
-- (policies exist but RLS was never enabled)
-- ============================================================
alter table public.delivery_codes enable row level security;
alter table public.store_schedules enable row level security;

-- ============================================================
-- BUG 2: Replace raw_user_meta_data-based admin checks with
-- secure profiles.role lookups (privilege escalation fix)
-- ============================================================
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "stores_update_owner" on public.stores;
create policy "stores_update_owner" on public.stores
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "store_applications_select_admin" on public.store_applications;
create policy "store_applications_select_admin" on public.store_applications
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "driver_applications_select_admin" on public.driver_applications;
create policy "driver_applications_select_admin" on public.driver_applications
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- BUG 3: Add UNIQUE constraint to promotions.code
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_code_key') then
    alter table public.promotions add constraint promotions_code_key unique (code);
  end if;
end $$;

-- ============================================================
-- BUG 4: Add UNIQUE constraint to categories.name
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_name_key') then
    alter table public.categories add constraint categories_name_key unique (name);
  end if;
end $$;

-- ============================================================
-- BUG 5: State machine — allow transitions TO refunded from
-- delivered and cancelled (currently unreachable enum value)
-- ============================================================
create or replace function public.validate_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status not in ('accepted', 'cancelled') then
    raise exception 'Invalid transition: pending -> %', new.status;
  end if;
  if old.status = 'accepted' and new.status not in ('preparing', 'cancelled') then
    raise exception 'Invalid transition: accepted -> %', new.status;
  end if;
  if old.status = 'preparing' and new.status not in ('picked_up', 'cancelled') then
    raise exception 'Invalid transition: preparing -> %', new.status;
  end if;
  if old.status = 'picked_up' and new.status not in ('on_the_way') then
    raise exception 'Invalid transition: picked_up -> %', new.status;
  end if;
  if old.status = 'on_the_way' and new.status not in ('arrived', 'delivered') then
    raise exception 'Invalid transition: on_the_way -> %', new.status;
  end if;
  if old.status = 'arrived' and new.status not in ('delivered') then
    raise exception 'Invalid transition: arrived -> %', new.status;
  end if;
  if old.status = 'delivered' and new.status not in ('refunded') then
    raise exception 'Invalid transition: delivered -> %', new.status;
  end if;
  if old.status = 'cancelled' and new.status not in ('refunded') then
    raise exception 'Invalid transition: cancelled -> %', new.status;
  end if;
  if old.status in ('refunded') then
    raise exception 'Cannot change status from final state: %', old.status;
  end if;
  return new;
end;
$$;
-- RayoExpress | Migration 012: RLS Policies
-- Adds missing RLS policies using raw_user_meta_data->>'role' for role checks

-- ============================================================
-- PROFILES
-- ============================================================
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- STORES
-- ============================================================
drop policy if exists "stores_select_open" on public.stores;
create policy "stores_select_open" on public.stores
  for select using (is_open = true);

drop policy if exists "stores_update_owner" on public.stores;
create policy "stores_update_owner" on public.stores
  for update using (
    auth.role() = 'authenticated' and (
      auth.uid() = owner_id or
      (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
    )
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
  for select using (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
drop policy if exists "products_select_active" on public.products;
create policy "products_select_active" on public.products
  for select using (is_active = true or exists (
    select 1 from public.stores where id = store_id and owner_id = auth.uid()
  ));

drop policy if exists "products_insert_store" on public.products;
create policy "products_insert_store" on public.products
  for insert with check (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "products_update_store" on public.products;
create policy "products_update_store" on public.products
  for update using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "products_delete_store" on public.products;
create policy "products_delete_store" on public.products
  for delete using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

-- ============================================================
-- ORDERS
-- ============================================================
drop policy if exists "orders_select_customer" on public.orders;
create policy "orders_select_customer" on public.orders
  for select using (auth.uid() = customer_id);

drop policy if exists "orders_select_driver" on public.orders;
create policy "orders_select_driver" on public.orders
  for select using (auth.uid() = driver_id);

drop policy if exists "orders_select_store" on public.orders;
create policy "orders_select_store" on public.orders
  for select using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

drop policy if exists "orders_insert_customer" on public.orders;
create policy "orders_insert_customer" on public.orders
  for insert with check (auth.uid() = customer_id);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
drop policy if exists "order_items_select_customer" on public.order_items;
create policy "order_items_select_customer" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
  );

drop policy if exists "order_items_select_driver" on public.order_items;
create policy "order_items_select_driver" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and driver_id = auth.uid())
  );

drop policy if exists "order_items_select_store" on public.order_items;
create policy "order_items_select_store" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select using (auth.uid() = user_id);

-- ============================================================
-- APPLICATIONS (store_applications & driver_applications)
-- ============================================================
drop policy if exists "store_applications_insert_self" on public.store_applications;
create policy "store_applications_insert_self" on public.store_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "driver_applications_insert_self" on public.driver_applications;
create policy "driver_applications_insert_self" on public.driver_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "store_applications_select_admin" on public.store_applications;
create policy "store_applications_select_admin" on public.store_applications
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

drop policy if exists "driver_applications_select_admin" on public.driver_applications
  ;
create policy "driver_applications_select_admin" on public.driver_applications
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

