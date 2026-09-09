-- RayoExpress | Migration 042: Order financial fields + tracking code
-- Separar valor productos vs servicio para control administrativo
-- NOTA: el FK de receiving_account_id -> bank_accounts se crea en 043
-- (la tabla aún no existe en este punto).

-- Secuencia para códigos RE-XXXXXX (la usa el trigger de esta migración).
CREATE SEQUENCE IF NOT EXISTS public.tracking_code_seq START 100000;

------------------------------------------------------------
-- Columnas financieras en orders
------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_total numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS other_charges numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiving_account_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_advance numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id);

-- Backfill: orders existentes -> product_total=0, service_fee=delivery_fee
UPDATE public.orders 
SET service_fee = delivery_fee, product_total = 0 
WHERE product_total = 0 AND service_fee = 0;

-- Índices para tracking_code
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);

------------------------------------------------------------
-- Función para generar tracking_code automáticamente
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger AS $$
DECLARE
    v_next bigint;
BEGIN
    -- Solo genera si la app no asignó uno (respeta códigos preexistentes).
    IF NEW.tracking_code IS NULL THEN
        SELECT COALESCE(nextval('tracking_code_seq'), 0) INTO v_next;
        NEW.tracking_code := 'RE-' || LPAD(v_next::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

------------------------------------------------------------
-- Trigger para auto-generar tracking_code al insertar pedido
------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_generate_tracking_code ON public.orders;
CREATE TRIGGER trg_generate_tracking_code
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_tracking_code();

-- NOTA: no se crea trigger propio de auditoría: el trigger existente
-- on_order_status_change (log_order_status_change) ya registra INSERTs y
-- cambios de estado en order_status_history.
