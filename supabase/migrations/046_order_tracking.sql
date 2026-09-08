-- RayoExpress | Migration 046: Public order tracking (Fase 3 - realtime)
--
-- Problema: el cliente consulta sin login, pero RLS de `orders` exige auth.
-- RLS no puede limitar columnas, así que exponemos una tabla espejo con
-- SOLO campos públicos, sincronizada por trigger. El socket realtime se
-- suscribe a esta tabla (filtro tracking_code), nunca a `orders`.
--
-- Campos públicos: tracking_code, status, store_name, order_description,
-- product_total, service_fee, other_charges, discount_amount, total,
-- driver_name, created_at, updated_at.
-- NUNCA aquí: payment_status, receiving_account_id, driver_advance,
-- customer_phone, delivery_address, liquidaciones.

CREATE TABLE IF NOT EXISTS public.order_tracking (
  tracking_code text PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  store_name text,
  order_description text,
  product_total numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  other_charges numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  driver_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon + authenticated): solo existen columnas seguras.
DROP POLICY IF EXISTS "order_tracking_public_select" ON public.order_tracking;
CREATE POLICY "order_tracking_public_select" ON public.order_tracking
  FOR SELECT TO anon, authenticated USING (true);

-- Sin INSERT/UPDATE/DELETE desde cliente: solo el trigger (SECURITY DEFINER).

CREATE INDEX IF NOT EXISTS idx_order_tracking_updated ON public.order_tracking(updated_at DESC);

------------------------------------------------------------
-- Sync trigger desde orders
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_order_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_name text;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.driver_id IS NOT NULL THEN
    SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.driver_id;
  ELSE
    v_driver_name := NULL;
  END IF;

  INSERT INTO public.order_tracking (
    tracking_code, order_id, status, store_name, order_description,
    product_total, service_fee, other_charges, discount_amount, total,
    driver_name, created_at, updated_at
  ) VALUES (
    NEW.tracking_code, NEW.id, NEW.status, NEW.store_name, NEW.order_description,
    COALESCE(NEW.product_total, 0), COALESCE(NEW.service_fee, 0),
    COALESCE(NEW.other_charges, 0), COALESCE(NEW.discount_amount, 0),
    COALESCE(NEW.total, 0),
    v_driver_name, NEW.created_at, NEW.updated_at
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
    updated_at = EXCLUDED.updated_at;

  -- Si cambió el código, elimina la fila del código anterior.
  IF TG_OP = 'UPDATE' AND OLD.tracking_code IS NOT NULL
     AND OLD.tracking_code IS DISTINCT FROM NEW.tracking_code THEN
    DELETE FROM public.order_tracking WHERE tracking_code = OLD.tracking_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_tracking ON public.orders;
CREATE TRIGGER trg_sync_order_tracking
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_tracking();

-- Limpieza al borrar pedido (CASCADE ya lo cubre, pero por si tracking_code cambió).
CREATE OR REPLACE FUNCTION public.cleanup_order_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.order_tracking WHERE order_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_order_tracking ON public.orders;
CREATE TRIGGER trg_cleanup_order_tracking
  AFTER DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_order_tracking();

------------------------------------------------------------
-- Backfill de pedidos existentes con tracking_code
------------------------------------------------------------
INSERT INTO public.order_tracking (
  tracking_code, order_id, status, store_name, order_description,
  product_total, service_fee, other_charges, discount_amount, total,
  driver_name, created_at, updated_at
)
SELECT
  o.tracking_code, o.id, o.status, o.store_name, o.order_description,
  COALESCE(o.product_total, 0), COALESCE(o.service_fee, 0),
  COALESCE(o.other_charges, 0), COALESCE(o.discount_amount, 0),
  COALESCE(o.total, 0),
  p.full_name, o.created_at, o.updated_at
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.driver_id
WHERE o.tracking_code IS NOT NULL
ON CONFLICT (tracking_code) DO NOTHING;

------------------------------------------------------------
-- Realtime: publicar la tabla espejo
------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
  END IF;
END;
$$;
