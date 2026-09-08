-- RayoExpress | Migration 048: Formal driver settlement (Fase 7)
--
-- Regla contable (documentada, NO "recibido = ganancia"):
--   driver_share   = 75% de service_fee de entregados del período
--   admin_share    = 25% de service_fee
--   total_advances = dinero que el repartidor adelantó (a su favor, se suma)
--   collected_cash = efectivo cobrado a clientes y que debe entregar (se resta)
--                    (pedidos del repartidor, pagados, método cash)
--   previous_balance = suma de net_payable PENDIENTES de períodos anteriores
--   net_payable = driver_share + total_advances - collected_cash + previous_balance
--   Positivo  => el admin le paga al repartidor.
--   Negativo  => el repartidor debe entregar |net| al admin.

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
  collected_cash numeric,
  previous_balance numeric,
  net_payable numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH period_orders AS (
    SELECT o.service_fee, o.driver_advance, o.total, o.payment_method, o.payment_status
    FROM public.orders o
    WHERE o.driver_id = p_driver_id
      AND o.status = 'delivered'
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day'
  ),
  agg AS (
    SELECT
      COALESCE(SUM(service_fee), 0)::numeric(10,2) AS service_total,
      COALESCE(SUM(driver_advance), 0)::numeric(10,2) AS advance_total,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' AND payment_status = 'paid' THEN total ELSE 0 END), 0)::numeric(10,2) AS collected_total
    FROM period_orders
  ),
  prev AS (
    SELECT COALESCE(SUM(net_payable), 0)::numeric(10,2) AS prev_total
    FROM public.driver_liquidations l
    WHERE l.driver_id = p_driver_id
      AND l.status = 'pending'
      AND l.period_end < p_period_start
  )
  SELECT
    agg.service_total,
    (agg.service_total * 0.75)::numeric(10,2),
    (agg.service_total * 0.25)::numeric(10,2),
    agg.advance_total,
    agg.collected_total,
    prev.prev_total,
    (agg.service_total * 0.75 + agg.advance_total - agg.collected_total + prev.prev_total)::numeric(10,2)
  FROM agg CROSS JOIN prev;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_driver_liquidation(UUID, DATE, DATE) TO authenticated;
