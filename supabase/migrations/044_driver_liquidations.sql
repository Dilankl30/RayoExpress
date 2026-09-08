-- RayoExpress | Migration 044: Driver liquidations for payment control

CREATE SEQUENCE IF NOT EXISTS public.tracking_code_seq START 100000;

CREATE TABLE IF NOT EXISTS public.driver_liquidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_service_fees numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_service_fees >= 0),
  driver_share numeric(10,2) NOT NULL DEFAULT 0 CHECK (driver_share >= 0),       -- 75% of service_fees
  admin_share numeric(10,2) NOT NULL DEFAULT 0 CHECK (admin_share >= 0),         -- 25% of service_fees
  total_advances numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_advances >= 0),
  payments_received numeric(10,2) NOT NULL DEFAULT 0 CHECK (payments_received >= 0),
  previous_balance numeric(10,2) NOT NULL DEFAULT 0 CHECK (previous_balance >= 0),
  net_payable numeric(10,2) NOT NULL DEFAULT 0 CHECK (net_payable >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, period_start, period_end)
);

ALTER TABLE public.driver_liquidations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "liquidations_admin_all" ON public.driver_liquidations;
CREATE POLICY "liquidations_admin_all" ON public.driver_liquidations
  FOR ALL USING (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

DROP POLICY IF EXISTS "liquidations_driver_select" ON public.driver_liquidations;
CREATE POLICY "liquidations_driver_select" ON public.driver_liquidations
  FOR SELECT USING (
    exists (select 1 from public.drivers d where d.id = auth.uid() and d.id = driver_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_liquidations_driver ON public.driver_liquidations(driver_id);
CREATE INDEX IF NOT EXISTS idx_liquidations_period ON public.driver_liquidations(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_liquidations_status ON public.driver_liquidations(status);

------------------------------------------------------------
-- Función para calcular liquidación automáticamente
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_driver_liquidation(
  p_driver_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE (
  total_service_fees numeric,
  driver_share numeric,
  admin_share numeric,
  total_advances numeric,
  payments_received numeric,
  previous_balance numeric,
  net_payable numeric
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH service_data AS (
    SELECT COALESCE(SUM(o.service_fee), 0)::numeric(10,2) as service_total
    FROM public.orders o
    WHERE o.driver_id = p_driver_id
      AND o.status = 'delivered'
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day'
  ),
  advances_data AS (
    SELECT COALESCE(SUM(o.driver_advance), 0)::numeric(10,2) as advance_total
    FROM public.orders o
    WHERE o.driver_id = p_driver_id
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day'
  ),
  received_data AS (
    SELECT COALESCE(SUM(l.payments_received), 0)::numeric(10,2) as received_total
    FROM public.driver_liquidations l
    WHERE l.driver_id = p_driver_id
      AND l.status = 'paid'
      AND l.period_end >= p_period_start
      AND l.period_end < p_period_end + INTERVAL '1 day'
  )
  SELECT 
    sd.service_total,
    (sd.service_total * 0.75)::numeric(10,2),
    (sd.service_total * 0.25)::numeric(10,2),
    ad.advance_total,
    COALESCE(r.received_total, 0),
    (SELECT COALESCE(SUM(l.net_payable), 0)::numeric(10,2) 
     FROM public.driver_liquidations l 
     WHERE l.driver_id = p_driver_id 
       AND l.period_end < p_period_start
       AND l.status IN ('pending','paid'))
  FROM service_data sd
  CROSS JOIN advances_data ad
  LEFT JOIN received_data r ON true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_driver_liquidation(UUID, DATE, DATE) TO authenticated;
