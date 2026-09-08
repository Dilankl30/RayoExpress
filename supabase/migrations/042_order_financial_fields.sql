-- RayoExpress | Migration 042: Order financial fields + tracking code
-- Separar valor productos vs servicio para control administrativo

------------------------------------------------------------
-- Columnas financieras en orders
------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_total numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS other_charges numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiving_account_id uuid REFERENCES public.bank_accounts(id);
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
    SELECT COALESCE(nextval('tracking_code_seq'), 0) INTO v_next;
    NEW.tracking_code := 'RE-' || LPAD(v_next::text, 6, '0');
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

------------------------------------------------------------
-- Auditoría: registrar quién creó/modificó pedidos
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_order_change()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.order_status_history (order_id, status, changed_by, created_at)
        VALUES (NEW.id, NEW.status, NEW.created_by, now());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status OR OLD.total IS DISTINCT FROM NEW.total THEN
            INSERT INTO public.order_status_history (order_id, status, changed_by, created_at)
            VALUES (NEW.id, NEW.status, NEW.updated_by, now());
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_order_changes ON public.orders;
CREATE TRIGGER trg_audit_order_changes
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_change();
