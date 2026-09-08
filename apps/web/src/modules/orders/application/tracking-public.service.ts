import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import type { OrderStatus } from '../domain/order-status.machine';

export interface PublicOrder {
  tracking_code: string;
  status: OrderStatus;
  store_name: string | null;
  order_description: string | null;
  product_total: number;
  service_fee: number;
  other_charges: number;
  discount_amount: number;
  total: number;
  driver_name: string | null;
  created_at: string;
  updated_at: string;
}

const TRACKING_CODE_RE = /^RE-\d{6}$/i;
const RATE_KEY = 'rayoexpress-tracking-attempts';
const BLOCK_KEY = 'rayoexpress-tracking-blocked-until';
const MAX_ATTEMPTS_PER_MINUTE = 10;
const BLOCK_MS_AFTER_ABUSE = 60_000;

function now(): number {
  return Date.now();
}

function readAttempts(): number[] {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as number[];
    if (!Array.isArray(arr)) return [];
    const cutoff = now() - 60_000;
    return arr.filter((t) => typeof t === 'number' && t > cutoff);
  } catch {
    return [];
  }
}

function recordAttempt(): void {
  try {
    const attempts = [...readAttempts(), now()];
    localStorage.setItem(RATE_KEY, JSON.stringify(attempts.slice(-20)));
  } catch {
    /* noop */
  }
}

export function isTrackingBlocked(): boolean {
  try {
    const until = Number(localStorage.getItem(BLOCK_KEY) || 0);
    return Number.isFinite(until) && until > now();
  } catch {
    return false;
  }
}

function blockTemporarily(): void {
  try {
    localStorage.setItem(BLOCK_KEY, String(now() + BLOCK_MS_AFTER_ABUSE));
  } catch {
    /* noop */
  }
}

export function normalizeTrackingCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!TRACKING_CODE_RE.test(cleaned)) return null;
  return cleaned;
}

function mockPublicOrder(code: string): PublicOrder | null {
  // Mock para desarrollo sin Supabase: solo RE-000123 existe
  if (code === 'RE-000123') {
    return {
      tracking_code: code,
      status: 'on_the_way',
      store_name: 'Pizzería Napoli (demo)',
      order_description: '2 hamburguesas especiales, 1 papas grandes y 2 gaseosas.',
      product_total: 20,
      service_fee: 4,
      other_charges: 0,
      discount_amount: 0,
      total: 24,
      driver_name: 'Juan Carlos',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return null;
}

export async function getPublicOrderByTrackingCode(rawCode: string): Promise<PublicOrder> {
  const code = normalizeTrackingCode(rawCode);
  if (!code) {
    throw new Error('Código inválido. Usa el formato RE-000123.');
  }

  if (isTrackingBlocked()) {
    throw new Error('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  }

  const attempts = readAttempts();
  if (attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
    blockTemporarily();
    throw new Error('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  }
  recordAttempt();

  if (!isSupabaseReady) {
    const mock = mockPublicOrder(code);
    if (!mock) throw new Error('No encontramos un pedido con ese código. Verifica e inténtalo de nuevo.');
    return mock;
  }

  const supabase = getSupabase();
  // Solo campos públicos. Nunca: payment_status, receiving_account_id,
  // driver_advance, customer_phone, delivery_address exacta, liquidaciones.
  const { data, error } = await supabase
    .from('orders')
    .select(
      'tracking_code, status, store_name, order_description, product_total, service_fee, other_charges, discount_amount, total, created_at, updated_at, driver:profiles!driver_id(full_name)',
    )
    .eq('tracking_code', code)
    .maybeSingle();

  if (error) throw new Error('No pudimos consultar tu pedido. Inténtalo de nuevo.');
  if (!data) throw new Error('No encontramos un pedido con ese código. Verifica e inténtalo de nuevo.');

  const row = data as unknown as {
    tracking_code: string;
    status: OrderStatus;
    store_name: string | null;
    order_description: string | null;
    product_total: number;
    service_fee: number;
    other_charges: number;
    discount_amount: number;
    total: number;
    created_at: string;
    updated_at: string;
    driver?: { full_name?: string | null } | null;
  };

  return {
    tracking_code: row.tracking_code,
    status: row.status,
    store_name: row.store_name,
    order_description: row.order_description,
    product_total: Number(row.product_total ?? 0),
    service_fee: Number(row.service_fee ?? 0),
    other_charges: Number(row.other_charges ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    total: Number(row.total ?? 0),
    driver_name: row.driver?.full_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
