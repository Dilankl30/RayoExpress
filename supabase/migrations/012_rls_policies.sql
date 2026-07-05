-- RayoExpress | Migration 012: RLS Policies
-- Adds missing RLS policies using raw_user_meta_data->>'role' for role checks

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY IF NOT EXISTS "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- STORES
-- ============================================================
CREATE POLICY IF NOT EXISTS "stores_select_open" ON public.stores
  FOR SELECT USING (is_open = true);

CREATE POLICY IF NOT EXISTS "stores_update_owner" ON public.stores
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      auth.uid() = owner_id OR
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    )
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE POLICY IF NOT EXISTS "categories_select_all" ON public.categories
  FOR SELECT USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY IF NOT EXISTS "products_select_active" ON public.products
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "products_insert_store" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "products_update_store" ON public.products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "products_delete_store" ON public.products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY IF NOT EXISTS "orders_select_customer" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY IF NOT EXISTS "orders_select_driver" ON public.orders
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY IF NOT EXISTS "orders_select_store" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "orders_select_admin" ON public.orders
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY IF NOT EXISTS "orders_insert_customer" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY IF NOT EXISTS "order_items_select_customer" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "order_items_select_driver" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND driver_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "order_items_select_store" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "order_items_select_admin" ON public.order_items
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY IF NOT EXISTS "notifications_select_self" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- APPLICATIONS (store_applications & driver_applications)
-- ============================================================
CREATE POLICY IF NOT EXISTS "store_applications_insert_self" ON public.store_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "driver_applications_insert_self" ON public.driver_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "store_applications_select_admin" ON public.store_applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY IF NOT EXISTS "driver_applications_select_admin" ON public.driver_applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );
