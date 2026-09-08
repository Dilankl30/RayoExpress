import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

/** Regla RayoExpress: el servicio se reparte 25% admin / 75% repartidor. */
export const ADMIN_SHARE = 0.25;
export const DRIVER_SHARE = 0.75;

export interface DriverDailyRow {
  driver_id: string | null;
  driver_name: string;
  orders: number;
  services: number;
  share75: number;
  advances: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD (local)
  orders: { total: number; delivered: number; inTransit: number; pending: number };
  economic: { products: number; services: number; received: number; pendingAmount: number; advances: number };
  distribution: { admin25: number; drivers75: number };
  byDriver: DriverDailyRow[];
}

const IN_TRANSIT = ['picked_up', 'on_the_way', 'arrived'];
const PENDING = ['confirmed', 'preparing', 'ready'];

export function dayBounds(date: Date): { start: string; end: string; key: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return { start: start.toISOString(), end: end.toISOString(), key };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type SummaryRow = {
  status: string;
  product_total: number;
  service_fee: number;
  total: number;
  payment_status: string;
  driver_advance: number;
  driver_id: string | null;
  driver?: { full_name?: string | null } | null;
};

export function buildDailySummary(dateKey: string, rows: SummaryRow[]): DailySummary {
  const valid = rows.filter((r) => r.status !== 'cancelled');
  const delivered = valid.filter((r) => r.status === 'delivered');

  const orders = {
    total: valid.length,
    delivered: delivered.length,
    inTransit: valid.filter((r) => IN_TRANSIT.includes(r.status)).length,
    pending: valid.filter((r) => PENDING.includes(r.status)).length,
  };

  const economic = {
    products: round2(delivered.reduce((s, r) => s + Number(r.product_total ?? 0), 0)),
    services: round2(delivered.reduce((s, r) => s + Number(r.service_fee ?? 0), 0)),
    received: round2(delivered.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + Number(r.total ?? 0), 0)),
    pendingAmount: round2(delivered.filter((r) => r.payment_status !== 'paid').reduce((s, r) => s + Number(r.total ?? 0), 0)),
    advances: round2(delivered.reduce((s, r) => s + Number(r.driver_advance ?? 0), 0)),
  };

  // El 25/75 se aplica SOLO sobre el servicio, nunca sobre productos.
  const distribution = {
    admin25: round2(economic.services * ADMIN_SHARE),
    drivers75: round2(economic.services * DRIVER_SHARE),
  };

  const byDriverMap = new Map<string, DriverDailyRow>();
  for (const r of delivered) {
    const key = r.driver_id ?? 'unassigned';
    const row = byDriverMap.get(key) ?? {
      driver_id: r.driver_id,
      driver_name: r.driver_id ? (r.driver?.full_name ?? 'Repartidor') : 'Sin asignar',
      orders: 0,
      services: 0,
      share75: 0,
      advances: 0,
    };
    row.orders += 1;
    row.services = round2(row.services + Number(r.service_fee ?? 0));
    row.advances = round2(row.advances + Number(r.driver_advance ?? 0));
    byDriverMap.set(key, row);
  }
  const byDriver = [...byDriverMap.values()]
    .map((r) => ({ ...r, services: round2(r.services), share75: round2(r.services * DRIVER_SHARE) }))
    .sort((a, b) => b.services - a.services);

  return { date: dateKey, orders, economic, distribution, byDriver };
}

function mockSummary(dateKey: string): DailySummary {
  // Ejemplo coherente con el spec: 25 pedidos, $430 productos, $85 servicios.
  const rows: SummaryRow[] = [];
  for (let i = 0; i < 20; i++) {
    rows.push({
      status: 'delivered',
      product_total: 21.5,
      service_fee: 4.25,
      total: 25.75,
      payment_status: i < 18 ? 'paid' : 'pending',
      driver_advance: 20,
      driver_id: i % 2 === 0 ? 'mock-driver-1' : 'mock-driver-2',
      driver: { full_name: i % 2 === 0 ? 'Juan Carlos' : 'Pedro López' },
    });
  }
  for (let i = 0; i < 3; i++) {
    rows.push({ status: 'on_the_way', product_total: 0, service_fee: 0, total: 0, payment_status: 'pending', driver_advance: 0, driver_id: 'mock-driver-1', driver: { full_name: 'Juan Carlos' } });
  }
  for (let i = 0; i < 2; i++) {
    rows.push({ status: 'confirmed', product_total: 0, service_fee: 0, total: 0, payment_status: 'pending', driver_advance: 0, driver_id: null, driver: null });
  }
  return buildDailySummary(dateKey, rows);
}

/** Resumen económico del día (local). Base: pedidos entregados, cancelados excluidos. */
export async function getDailySummary(date: Date = new Date()): Promise<DailySummary> {
  const { start, end, key } = dayBounds(date);
  if (!isSupabaseReady) return mockSummary(key);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('status, product_total, service_fee, total, payment_status, driver_advance, driver_id, driver:profiles!driver_id(full_name)')
    .gte('created_at', start)
    .lt('created_at', end)
    .neq('status', 'cancelled')
    .limit(500);
  if (error) throw error;
  return buildDailySummary(key, ((data ?? []) as unknown as SummaryRow[]));
}
