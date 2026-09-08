-- RayoExpress | Migration 045: Manual WhatsApp orders support
-- Pedidos creados por admin tras confirmación por WhatsApp, sin catálogo

-- store_id pasa a ser opcional (pedido manual puede no tener tienda registrada)
ALTER TABLE public.orders ALTER COLUMN store_id DROP NOT NULL;

-- Datos cliente manual (sin necesidad de crear perfil completo)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_reference text;

-- Datos restaurante/tienda manual (texto libre, sin portal)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_address text;

-- Descripción libre del pedido (ej: "2 hamburguesas, 1 papas, 2 gaseosas")
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_description text;

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
