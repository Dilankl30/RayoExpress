-- RayoExpress | Migration 047: Public courier GPS (Fase 4 - mapa)
--
-- El GPS solo muestra dónde está el repartidor cuando el pedido está en
-- camino. `locations` exige auth (RLS), así que se expone un espejo con SOLO
-- posición + timestamp, sincronizado por trigger. Sin coordenadas, sin
-- user_id, sin historial.
--
-- Además se agregan coordenadas de tienda/destino a `order_tracking` para
-- dibujar el recorrido. Pedidos manuales sin coordenadas => mapa degradado
-- con mensaje (nunca rompe la página).

------------------------------------------------------------
-- 1. Coordenadas en order_tracking
------------------------------------------------------------
ALTER TABLE public.order_tracking ADD COLUMN IF NOT EXISTS store_lat double precision;
ALTER TABLE public.order_tracking ADD COLUMN IF NOT EXISTS store_lng double precision;
ALTER TABLE public.order_tracking ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE public.order_tracking ADD COLUMN IF NOT EXISTS delivery_lng double precision;

------------------------------------------------------------
-- 2. Espejo de posición del repartidor
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courier_positions (
  tracking_code text PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_positions_public_select" ON public.courier_positions;
CREATE POLICY "courier_positions_public_select" ON public.courier_positions
  FOR SELECT TO anon, authenticated USING (true);

-- Sin escritura desde cliente: solo trigger SECURITY DEFINER.
CREATE INDEX IF NOT EXISTS idx_courier_positions_updated ON public.courier_positions(updated_at DESC);

------------------------------------------------------------
-- 3. Sync ampliado: order_tracking incluye coords tienda/destino
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_order_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_name text;
  v_store_lat double precision;
  v_store_lng double precision;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.driver_id IS NOT NULL THEN
    SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.driver_id;
  ELSE
    v_driver_name := NULL;
  END IF;

  IF NEW.store_id IS NOT NULL THEN
    SELECT latitude, longitude INTO v_store_lat, v_store_lng
    FROM public.stores WHERE id = NEW.store_id;
  ELSE
    v_store_lat := NULL;
    v_store_lng := NULL;
  END IF;

  INSERT INTO public.order_tracking (
    tracking_code, order_id, status, store_name, order_description,
    product_total, service_fee, other_charges, discount_amount, total,
    driver_name, store_lat, store_lng, delivery_lat, delivery_lng,
    created_at, updated_at
  ) VALUES (
    NEW.tracking_code, NEW.id, NEW.status, NEW.store_name, NEW.order_description,
    COALESCE(NEW.product_total, 0), COALESCE(NEW.service_fee, 0),
    COALESCE(NEW.other_charges, 0), COALESCE(NEW.discount_amount, 0),
    COALESCE(NEW.total, 0),
    v_driver_name, v_store_lat, v_store_lng, NEW.delivery_lat, NEW.delivery_lng,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (tracking_code) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    status = EXCLUDED.status,
    store_name = EXCLUDED.store_name,
    order_description = EXCLUDED.order_description,
    product_total = EXCLUDED.product_total,
    service_fee = EXCLUDED.service_fee,
    other_charges = EXCLUDED.other_charges,
    discount_amount = EXCLUDED.discount_amount,
    total = EXCLUDED.total,
    driver_name = EXCLUDED.driver_name,
    store_lat = EXCLUDED.store_lat,
    store_lng = EXCLUDED.store_lng,
    delivery_lat = EXCLUDED.delivery_lat,
    delivery_lng = EXCLUDED.delivery_lng,
    updated_at = EXCLUDED.updated_at;

  IF TG_OP = 'UPDATE' AND OLD.tracking_code IS NOT NULL
     AND OLD.tracking_code IS DISTINCT FROM NEW.tracking_code THEN
    DELETE FROM public.order_tracking WHERE tracking_code = OLD.tracking_code;
    DELETE FROM public.courier_positions WHERE tracking_code = OLD.tracking_code;
  END IF;

  RETURN NEW;
END;
$$;

------------------------------------------------------------
-- 4. Trigger locations -> courier_positions (solo última posición)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_courier_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking text;
  v_order uuid;
BEGIN
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tracking_code, id INTO v_tracking, v_order
  FROM public.orders WHERE id = NEW.order_id;

  IF v_tracking IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.courier_positions (tracking_code, order_id, lat, lng, updated_at)
  VALUES (v_tracking, v_order, NEW.lat, NEW.lng, NEW.created_at)
  ON CONFLICT (tracking_code) DO UPDATE SET
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    updated_at = EXCLUDED.updated_at
  WHERE public.courier_positions.updated_at <= EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_courier_position ON public.locations;
CREATE TRIGGER trg_sync_courier_position
  AFTER INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_courier_position();

------------------------------------------------------------
-- 5. Backfill
------------------------------------------------------------
-- Coords en espejo existente
UPDATE public.order_tracking t SET
  store_lat = s.latitude,
  store_lng = s.longitude,
  delivery_lat = o.delivery_lat,
  delivery_lng = o.delivery_lng
FROM public.orders o
LEFT JOIN public.stores s ON s.id = o.store_id
WHERE t.order_id = o.id
  AND (t.store_lat IS NULL OR t.delivery_lat IS NULL);

-- Última posición conocida por pedido con tracking
INSERT INTO public.courier_positions (tracking_code, order_id, lat, lng, updated_at)
SELECT o.tracking_code, o.id, l.lat, l.lng, l.created_at
FROM public.orders o
JOIN LATERAL (
  SELECT lat, lng, created_at FROM public.locations
  WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
) l ON true
WHERE o.tracking_code IS NOT NULL
ON CONFLICT (tracking_code) DO NOTHING;

------------------------------------------------------------
-- 6. Realtime
------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'courier_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_positions;
  END IF;
END;
$$;
