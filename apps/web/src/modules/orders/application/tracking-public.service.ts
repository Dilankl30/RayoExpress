import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
const DEFAULT_POLL_MS = 15_000;

function now(): number {
  return Date.now();
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readAttempts(): number[] {
  try {
    const store = storage();
    if (!store) return [];
    const raw = store.getItem(RATE_KEY);
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
    const store = storage();
    if (!store) return;
    const attempts = [...readAttempts(), now()];
    store.setItem(RATE_KEY, JSON.stringify(attempts.slice(-20)));
  } catch {
    /* noop */
  }
}

export function isTrackingBlocked(): boolean {
  try {
    const store = storage();
    if (!store) return false;
    const until = Number(store.getItem(BLOCK_KEY) || 0);
    return Number.isFinite(until) && until > now();
  } catch {
    return false;
  }
}

function blockTemporarily(): void {
  try {
    storage()?.setItem(BLOCK_KEY, String(now() + BLOCK_MS_AFTER_ABUSE));
  } catch {
    /* noop */
  }
}

function checkRateLimit(): void {
  if (isTrackingBlocked()) {
    throw new Error('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  }
  if (readAttempts().length >= MAX_ATTEMPTS_PER_MINUTE) {
    blockTemporarily();
    throw new Error('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  }
  recordAttempt();
}

export function normalizeTrackingCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!TRACKING_CODE_RE.test(cleaned)) return null;
  return cleaned;
}

type TrackingRow = {
  tracking_code: string;
  status: string;
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
};

function mapTrackingRow(row: TrackingRow): PublicOrder {
  return {
    tracking_code: row.tracking_code,
    status: row.status as OrderStatus,
    store_name: row.store_name,
    order_description: row.order_description,
    product_total: Number(row.product_total ?? 0),
    service_fee: Number(row.service_fee ?? 0),
    other_charges: Number(row.other_charges ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    total: Number(row.total ?? 0),
    driver_name: row.driver_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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

export async function getPublicOrderByTrackingCode(
  rawCode: string,
  opts?: { skipRateLimit?: boolean },
): Promise<PublicOrder> {
  const code = normalizeTrackingCode(rawCode);
  if (!code) {
    throw new Error('Código inválido. Usa el formato RE-000123.');
  }

  if (!opts?.skipRateLimit) checkRateLimit();

  if (!isSupabaseReady) {
    const mock = mockPublicOrder(code);
    if (!mock) throw new Error('No encontramos un pedido con ese código. Verifica e inténtalo de nuevo.');
    return mock;
  }

  const supabase = getSupabase();

  // Tabla espejo pública (anon-readable, solo columnas seguras).
  const { data, error } = await supabase
    .from('order_tracking')
    .select(
      'tracking_code, status, store_name, order_description, product_total, service_fee, other_charges, discount_amount, total, driver_name, created_at, updated_at',
    )
    .eq('tracking_code', code)
    .maybeSingle();

  if (!error && data) return mapTrackingRow(data as unknown as TrackingRow);

  // Fallback por compatibilidad (migración 046 aún no aplicada):
  // consulta `orders` con columnas seguras. Requiere sesión con permiso.
  const fallback = await supabase
    .from('orders')
    .select(
      'tracking_code, status, store_name, order_description, product_total, service_fee, other_charges, discount_amount, total, created_at, updated_at, driver:profiles!driver_id(full_name)',
    )
    .eq('tracking_code', code)
    .maybeSingle();

  if (fallback.error) throw new Error('No pudimos consultar tu pedido. Inténtalo de nuevo.');
  if (!fallback.data) throw new Error('No encontramos un pedido con ese código. Verifica e inténtalo de nuevo.');

  const row = fallback.data as unknown as TrackingRow & { driver?: { full_name?: string | null } | null };
  return {
    ...mapTrackingRow(row),
    driver_name: row.driver?.full_name ?? null,
  };
}

export interface PublicOrderSubscription {
  unsubscribe(): void;
}

function orderSignature(o: PublicOrder): string {
  return `${o.status}|${o.updated_at}|${o.total}|${o.driver_name ?? ''}`;
}

export function subscribeToPublicOrderTracking(
  rawCode: string,
  onUpdate: (order: PublicOrder) => void,
  opts?: { pollIntervalMs?: number; onError?: (e: Error) => void; initial?: PublicOrder },
): PublicOrderSubscription {
  const code = normalizeTrackingCode(rawCode);
  if (!code) throw new Error('Código inválido. Usa el formato RE-000123.');

  let stopped = false;
  let lastSig = opts?.initial ? orderSignature(opts.initial) : '';
  const pollMs = opts?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const onError = opts?.onError;
  let channel: RealtimeChannel | null = null;

  const applyRealtimeRow = (row: unknown) => {
    if (stopped || !row || typeof row !== 'object') return;
    try {
      const order = mapTrackingRow(row as TrackingRow);
      lastSig = orderSignature(order);
      onUpdate(order);
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('Error al procesar actualización.'));
    }
  };

  const poll = async () => {
    if (stopped) return;
    try {
      // El usuario ya validó el código; el polling no debe consumir su cuota.
      const fresh = await getPublicOrderByTrackingCode(code, { skipRateLimit: true });
      if (stopped) return;
      const sig = orderSignature(fresh);
      if (sig !== lastSig) {
        lastSig = sig;
        onUpdate(fresh);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('Error al actualizar.'));
    }
  };

  if (isSupabaseReady) {
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel(`public-tracking-${code}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_tracking', filter: `tracking_code=eq.${code}` },
          (payload: { new?: unknown }) => applyRealtimeRow(payload?.new),
        )
        .subscribe();
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('No se pudo activar el tiempo real.'));
    }
  }

  const timer = setInterval(() => void poll(), pollMs);
  // Primera sincronización diferida para no duplicar la carga inicial.
  const firstSync = setTimeout(() => void poll(), Math.min(pollMs, 5000));

  return {
    unsubscribe() {
      stopped = true;
      clearInterval(timer);
      clearTimeout(firstSync);
      try {
        if (channel && isSupabaseReady) getSupabase().removeChannel(channel);
      } catch {
        /* noop */
      }
    },
  };
}
