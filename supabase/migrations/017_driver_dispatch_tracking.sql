-- RayoExpress | Migration 017: Driver dispatch and realtime tracking

CREATE OR REPLACE FUNCTION public.driver_claim_order(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  total NUMERIC,
  status public.order_status,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  store_id UUID,
  store JSONB,
  customer JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_role public.app_role;
  v_claimed RECORD;
BEGIN
  v_driver_id := auth.uid();

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT profiles.role
  INTO v_role
  FROM public.profiles
  WHERE profiles.id = v_driver_id;

  IF v_role IS DISTINCT FROM 'driver' THEN
    RAISE EXCEPTION 'Solo los repartidores pueden tomar pedidos';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.drivers
    WHERE drivers.id = v_driver_id
      AND COALESCE(drivers.approved, false) = true
  ) THEN
    RAISE EXCEPTION 'Tu cuenta de repartidor aun no esta aprobada';
  END IF;

  UPDATE public.orders
  SET driver_id = v_driver_id
  WHERE orders.id = p_order_id
    AND orders.driver_id IS NULL
    AND orders.status IN ('accepted', 'preparing')
  RETURNING *
  INTO v_claimed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no disponible';
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (v_driver_id, 'Pedido tomado', 'Ya tienes un pedido asignado para entregar', 'order');

  RETURN QUERY
  SELECT
    v_claimed.id,
    v_claimed.total,
    v_claimed.status,
    v_claimed.delivery_address,
    v_claimed.notes,
    v_claimed.created_at,
    v_claimed.store_id,
    jsonb_build_object('name', stores.name, 'emoji', stores.emoji),
    jsonb_build_object('full_name', profiles.full_name)
  FROM public.stores
  JOIN public.profiles ON profiles.id = v_claimed.customer_id
  WHERE stores.id = v_claimed.store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.driver_claim_order(UUID) TO authenticated;

DROP POLICY IF EXISTS "orders_select_available_drivers" ON public.orders;
CREATE POLICY "orders_select_available_drivers" ON public.orders
  FOR SELECT USING (
    driver_id IS NULL
    AND status IN ('accepted', 'preparing')
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      JOIN public.drivers ON drivers.id = profiles.id
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'driver'
        AND COALESCE(drivers.approved, false) = true
    )
  );

DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_driver_active_order" ON public.locations;
CREATE POLICY "locations_insert_driver_active_order" ON public.locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      order_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_id
          AND orders.driver_id = auth.uid()
          AND orders.status IN ('picked_up', 'on_the_way', 'arrived')
      )
    )
  );
