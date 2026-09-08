import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeTrackingCode } from './tracking-public.service';
import type { OrderStatus } from '../domain/order-status.machine';

export interface CourierPosition {
  tracking_code: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export interface ArrivalWindow {
  min: number;
  max: number;
}

const DEFAULT_POLL_MS = 10_000;

/** Estados donde tiene sentido mostrar el mapa con GPS. */
export function shouldShowMap(status: OrderStatus): boolean {
  return status === 'picked_up' || status === 'on_the_way' || status === 'arrived';
}

function mockCourierPosition(code: string): CourierPosition | null {
  if (code !== 'RE-000123') return null;
  // Simula avance tienda -> destino para demo sin backend.
  const f = (Date.now() / 120_000) % 1;
  return {
    tracking_code: code,
    lat: -0.4632 + (-0.466 + 0.4632) * f,
    lng: -76.9892 + (-76.987 + 76.9892) * f,
    updated_at: new Date().toISOString(),
  };
}

export async function getCourierPosition(rawCode: string): Promise<CourierPosition | null> {
  const code = normalizeTrackingCode(rawCode);
  if (!code) throw new Error('Código inválido. Usa el formato RE-000123.');

  if (!isSupabaseReady) return mockCourierPosition(code);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('courier_positions')
    .select('tracking_code, lat, lng, updated_at')
    .eq('tracking_code', code)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  const row = data as unknown as CourierPosition;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { tracking_code: row.tracking_code, lat, lng, updated_at: row.updated_at };
}

export interface CourierSubscription {
  unsubscribe(): void;
}

function positionSignature(p: CourierPosition): string {
  return `${p.lat.toFixed(5)}|${p.lng.toFixed(5)}|${p.updated_at}`;
}

/**
 * Suscripción a la posición del repartidor (realtime + polling de respaldo).
 * Nunca lanza si no hay GPS: simplemente no notifica hasta que exista.
 */
export function subscribeToCourierPosition(
  rawCode: string,
  onUpdate: (pos: CourierPosition) => void,
  opts?: { pollIntervalMs?: number; onError?: (e: Error) => void; initial?: CourierPosition | null },
): CourierSubscription {
  const code = normalizeTrackingCode(rawCode);
  if (!code) throw new Error('Código inválido. Usa el formato RE-000123.');

  let stopped = false;
  let lastSig = opts?.initial ? positionSignature(opts.initial) : '';
  let hasPosition = !!opts?.initial;
  const pollMs = opts?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const onError = opts?.onError;
  let channel: RealtimeChannel | null = null;

  const applyRow = (row: unknown) => {
    if (stopped || !row || typeof row !== 'object') return;
    try {
      const r = row as { tracking_code: string; lat: unknown; lng: unknown; updated_at: string };
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const pos: CourierPosition = { tracking_code: r.tracking_code, lat, lng, updated_at: r.updated_at };
      // La primera posición siempre notifica (pasamos de "sin GPS" a "con GPS").
      const sig = positionSignature(pos);
      if (!hasPosition || sig !== lastSig) {
        hasPosition = true;
        lastSig = sig;
        onUpdate(pos);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('Error al procesar posición.'));
    }
  };

  const poll = async () => {
    if (stopped) return;
    try {
      const fresh = await getCourierPosition(code);
      if (stopped || !fresh) return;
      const sig = positionSignature(fresh);
      if (!hasPosition || sig !== lastSig) {
        hasPosition = true;
        lastSig = sig;
        onUpdate(fresh);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('Error al actualizar posición.'));
    }
  };

  if (isSupabaseReady) {
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel(`courier-${code}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'courier_positions', filter: `tracking_code=eq.${code}` },
          (payload: { new?: unknown }) => applyRow(payload?.new),
        )
        .subscribe();
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error('No se pudo activar el GPS en vivo.'));
    }
  }

  const timer = setInterval(() => void poll(), pollMs);

  return {
    unsubscribe() {
      stopped = true;
      clearInterval(timer);
      try {
        if (channel && isSupabaseReady) getSupabase().removeChannel(channel);
      } catch {
        /* noop */
      }
    },
  };
}

const BASE_ETA: Record<string, number> = {
  picked_up: 18,
  on_the_way: 12,
  arrived: 3,
};

/**
 * Ventana de llegada estimada. Con distancia conocida se ajusta por
 * velocidad urbana (~25 km/h + 2 min de buffer); sin distancia usa la base
 * por estado. Nunca expone coordenadas, solo minutos.
 */
export function estimateArrivalWindow(status: OrderStatus, distKm?: number | null): ArrivalWindow | null {
  const base = BASE_ETA[status];
  if (!base) return null;
  let eta = base;
  if (distKm != null && Number.isFinite(distKm) && distKm >= 0) {
    const travel = (distKm / 25) * 60 + 2;
    eta = Math.min(base, Math.max(2, Math.round(travel)));
  }
  return { min: Math.max(2, Math.round(eta - 4)), max: Math.round(eta + 2) };
}

export function formatArrivalWindow(w: ArrivalWindow | null): string {
  if (!w) return '';
  if (w.min >= w.max) return `${w.max} minutos`;
  return `${w.min}–${w.max} minutos`;
}
