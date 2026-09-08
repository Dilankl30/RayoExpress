import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { logAuditEvent } from '../../audit/application/audit.service';

export type LiquidationStatus = 'pending' | 'paid' | 'cancelled';

export interface SettlementOrder {
  id: string;
  tracking_code: string | null;
  total: number;
  service_fee: number;
  driver_advance: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export interface SettlementTotals {
  orders: number;
  services: number;
  driver75: number;
  admin25: number;
  advances: number;
  collected: number;
  previous: number;
  net: number;
}

export interface DriverSettlement {
  driver_id: string;
  driver_name: string;
  period_start: string;
  period_end: string;
  orders: SettlementOrder[];
  totals: SettlementTotals;
}

export interface LiquidationRecord {
  id: string;
  driver_id: string;
  driver_name: string | null;
  period_start: string;
  period_end: string;
  total_service_fees: number;
  driver_share: number;
  admin_share: number;
  total_advances: number;
  payments_received: number;
  previous_balance: number;
  net_payable: number;
  status: LiquidationStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Dos períodos [a,b] se solapan si a1 <= b2 && b1 <= a2. */
export function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function validatePeriod(start: string, end: string): void {
  if (!start || !end) throw new Error('Selecciona inicio y fin del período.');
  if (end < start) throw new Error('El fin del período no puede ser anterior al inicio.');
}

function computeTotals(
  orders: SettlementOrder[],
  previous: number,
): SettlementTotals {
  const services = round2(orders.reduce((s, o) => s + Number(o.service_fee ?? 0), 0));
  const advances = round2(orders.reduce((s, o) => s + Number(o.driver_advance ?? 0), 0));
  const collected = round2(
    orders
      .filter((o) => o.payment_method === 'cash' && o.payment_status === 'paid')
      .reduce((s, o) => s + Number(o.total ?? 0), 0),
  );
  const driver75 = round2(services * 0.75);
  return {
    orders: orders.length,
    services,
    driver75,
    admin25: round2(services * 0.25),
    advances,
    collected,
    previous: round2(previous),
    net: round2(driver75 + advances - collected + previous),
  };
}

// ---- Mock (sin Supabase) ----
const mockLiquidations: LiquidationRecord[] = [];

function mockSettlement(driverId: string, start: string, end: string): DriverSettlement {
  const orders: SettlementOrder[] = [
    { id: 'mock-o-1', tracking_code: 'RE-000120', total: 24, service_fee: 4, driver_advance: 20, payment_method: 'cash', payment_status: 'paid', created_at: `${start}T10:00:00` },
    { id: 'mock-o-2', tracking_code: 'RE-000121', total: 18, service_fee: 4, driver_advance: 14, payment_method: 'transfer', payment_status: 'paid', created_at: `${start}T12:00:00` },
  ];
  const previous = mockLiquidations
    .filter((l) => l.driver_id === driverId && l.status === 'pending' && l.period_end < start)
    .reduce((s, l) => s + l.net_payable, 0);
  return {
    driver_id: driverId,
    driver_name: 'Juan Carlos',
    period_start: start,
    period_end: end,
    orders,
    totals: computeTotals(orders, previous),
  };
}

/** Liquidación detallada del repartidor en el período (solo entregados). */
export async function getDriverSettlement(driverId: string, start: string, end: string): Promise<DriverSettlement> {
  validatePeriod(start, end);
  if (!driverId) throw new Error('Selecciona un repartidor.');
  if (!isSupabaseReady) return mockSettlement(driverId, start, end);

  const supabase = getSupabase();
  const [ordersRes, profileRes, prevRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, tracking_code, total, service_fee, driver_advance, payment_method, payment_status, created_at')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('created_at', start)
      .lt('created_at', `${end}T23:59:59.999`)
      .order('created_at', { ascending: true })
      .limit(500),
    supabase.from('profiles').select('full_name').eq('id', driverId).maybeSingle(),
    supabase
      .from('driver_liquidations')
      .select('net_payable')
      .eq('driver_id', driverId)
      .eq('status', 'pending')
      .lt('period_end', start),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (prevRes.error) throw prevRes.error;

  const orders = ((ordersRes.data ?? []) as unknown as SettlementOrder[]).map((o) => ({
    ...o,
    total: Number(o.total ?? 0),
    service_fee: Number(o.service_fee ?? 0),
    driver_advance: Number(o.driver_advance ?? 0),
  }));
  const previous = ((prevRes.data ?? []) as { net_payable: number }[]).reduce((s, l) => s + Number(l.net_payable ?? 0), 0);
  const profile = profileRes.data as { full_name?: string | null } | null;

  return {
    driver_id: driverId,
    driver_name: profile?.full_name ?? 'Repartidor',
    period_start: start,
    period_end: end,
    orders,
    totals: computeTotals(orders, previous),
  };
}

export async function listLiquidations(driverId?: string): Promise<LiquidationRecord[]> {
  if (!isSupabaseReady) {
    return [...mockLiquidations]
      .filter((l) => !driverId || l.driver_id === driverId)
      .sort((a, b) => (a.period_end < b.period_end ? 1 : -1));
  }
  const supabase = getSupabase();
  let query = supabase.from('driver_liquidations').select('*').order('period_end', { ascending: false }).limit(100);
  if (driverId) query = query.eq('driver_id', driverId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as (Omit<LiquidationRecord, 'driver_name'> & { paid_by?: string | null })[];
  const ids = [...new Set(rows.map((r) => r.driver_id))];
  let names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
    names = new Map(((profiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name ?? 'Repartidor']));
  }
  return rows.map((r) => ({ ...r, driver_name: names.get(r.driver_id) ?? null }));
}

/** Guarda la liquidación como pendiente (el cierre formal es marcarla pagada). */
export async function createLiquidation(driverId: string, start: string, end: string, notes?: string): Promise<LiquidationRecord> {
  validatePeriod(start, end);
  if (!driverId) throw new Error('Selecciona un repartidor.');

  if (!isSupabaseReady) {
    const overlap = mockLiquidations.some(
      (l) => l.driver_id === driverId && l.status !== 'cancelled' && periodsOverlap(l.period_start, l.period_end, start, end),
    );
    if (overlap) throw new Error('Ya existe una liquidación que cubre ese período.');
    const s = mockSettlement(driverId, start, end);
    const rec: LiquidationRecord = {
      id: `mock-liq-${Date.now()}`,
      driver_id: driverId,
      driver_name: s.driver_name,
      period_start: start,
      period_end: end,
      total_service_fees: s.totals.services,
      driver_share: s.totals.driver75,
      admin_share: s.totals.admin25,
      total_advances: s.totals.advances,
      payments_received: s.totals.collected,
      previous_balance: s.totals.previous,
      net_payable: s.totals.net,
      status: 'pending',
      paid_at: null,
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
    };
    mockLiquidations.push(rec);
    return rec;
  }

  const supabase = getSupabase();
  const { data: existing, error: existError } = await supabase
    .from('driver_liquidations')
    .select('id')
    .eq('driver_id', driverId)
    .neq('status', 'cancelled')
    .lte('period_start', end)
    .gte('period_end', start)
    .limit(1);
  if (existError) throw existError;
  if (existing && existing.length > 0) throw new Error('Ya existe una liquidación que cubre ese período.');

  const s = await getDriverSettlement(driverId, start, end);
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('driver_liquidations')
    .insert({
      driver_id: driverId,
      period_start: start,
      period_end: end,
      total_service_fees: s.totals.services,
      driver_share: s.totals.driver75,
      admin_share: s.totals.admin25,
      total_advances: s.totals.advances,
      payments_received: s.totals.collected,
      previous_balance: s.totals.previous,
      net_payable: s.totals.net,
      status: 'pending',
      notes: notes?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  await logAuditEvent({
    userId: authData.user?.id || '',
    action: 'liquidation_created',
    entityType: 'liquidation',
    entityId: (data as { id: string }).id,
    details: { driverId, start, end, net: s.totals.net },
  }).catch(() => {});

  const rec = data as unknown as Omit<LiquidationRecord, 'driver_name'>;
  return { ...rec, driver_name: s.driver_name };
}

/** Registra el pago de la liquidación al repartidor (cierre formal). */
export async function markLiquidationPaid(id: string): Promise<LiquidationRecord> {
  if (!isSupabaseReady) {
    const rec = mockLiquidations.find((l) => l.id === id);
    if (!rec) throw new Error('Liquidación no encontrada.');
    if (rec.status !== 'pending') throw new Error('Solo se pueden pagar liquidaciones pendientes.');
    rec.status = 'paid';
    rec.paid_at = new Date().toISOString();
    return rec;
  }
  const supabase = getSupabase();
  const { data: current, error: curError } = await supabase
    .from('driver_liquidations')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (curError) throw curError;
  if (!current) throw new Error('Liquidación no encontrada.');
  if ((current as { status: string }).status !== 'pending') {
    throw new Error('Solo se pueden pagar liquidaciones pendientes.');
  }
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('driver_liquidations')
    .update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: authData.user?.id ?? null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  await logAuditEvent({
    userId: authData.user?.id || '',
    action: 'liquidation_paid',
    entityType: 'liquidation',
    entityId: id,
    details: { net: (data as { net_payable: number }).net_payable },
  }).catch(() => {});

  return { ...(data as unknown as Omit<LiquidationRecord, 'driver_name'>), driver_name: null };
}
