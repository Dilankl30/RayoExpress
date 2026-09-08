import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ROW = {
  tracking_code: 'RE-000123',
  status: 'preparing',
  store_name: 'Pizzería Napoli',
  order_description: '2 hamburguesas.',
  product_total: 20,
  service_fee: 4,
  other_charges: 0,
  discount_amount: 0,
  total: 24,
  driver_name: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const fromCalls: string[] = [];
let realtimeHandler: ((payload: { new?: unknown }) => void) | null = null;
const removeChannel = vi.fn();
const fakeChannel = {
  on: vi.fn((_event: string, _filter: unknown, cb: (payload: { new?: unknown }) => void) => {
    realtimeHandler = cb;
    return fakeChannel;
  }),
  subscribe: vi.fn(() => fakeChannel),
};

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: true,
  getSupabase: () => ({
    from: (table: string) => {
      fromCalls.push(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...ROW }, error: null }),
          }),
        }),
      };
    },
    channel: () => fakeChannel,
    removeChannel,
  }),
}));

function installMemoryStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  });
}

import { getPublicOrderByTrackingCode, subscribeToPublicOrderTracking } from '../tracking-public.service';

describe('tracking-public realtime (Fase 3)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installMemoryStorage();
    vi.useFakeTimers();
    fromCalls.length = 0;
    realtimeHandler = null;
    removeChannel.mockClear();
    fakeChannel.on.mockClear();
    fakeChannel.subscribe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches from the public order_tracking mirror, never orders first', async () => {
    const order = await getPublicOrderByTrackingCode('RE-000123');
    expect(fromCalls[0]).toBe('order_tracking');
    expect(order.tracking_code).toBe('RE-000123');
    expect(order.status).toBe('preparing');
    expect(order).not.toHaveProperty('payment_status');
    expect(order).not.toHaveProperty('customer_phone');
  });

  it('throws synchronously for invalid codes on subscribe', () => {
    expect(() => subscribeToPublicOrderTracking('MALO', () => {})).toThrow('Código inválido');
  });

  it('subscribes to postgres_changes filtered by tracking_code', () => {
    const sub = subscribeToPublicOrderTracking('RE-000123', () => {}, { pollIntervalMs: 60000 });
    expect(fakeChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'order_tracking', filter: 'tracking_code=eq.RE-000123' },
      expect.any(Function),
    );
    expect(fakeChannel.subscribe).toHaveBeenCalled();
    sub.unsubscribe();
    expect(removeChannel).toHaveBeenCalled();
  });

  it('pushes realtime row updates to onUpdate (admin changes status -> client sees it)', () => {
    const onUpdate = vi.fn();
    const sub = subscribeToPublicOrderTracking('re-000123', onUpdate, { pollIntervalMs: 60000 });
    expect(realtimeHandler).not.toBeNull();
    realtimeHandler?.({ new: { ...ROW, status: 'on_the_way', driver_name: 'Juan Carlos', updated_at: '2026-01-01T00:05:00.000Z' } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ status: 'on_the_way', driver_name: 'Juan Carlos' });
    sub.unsubscribe();
  });

  it('polls as fallback and notifies only on change', async () => {
    const onUpdate = vi.fn();
    const seed = await getPublicOrderByTrackingCode('RE-000123');
    const sub = subscribeToPublicOrderTracking('RE-000123', onUpdate, { pollIntervalMs: 15000, initial: seed });
    // Primera sincronización diferida (5s): mismos datos, sin notificar
    await vi.advanceTimersByTimeAsync(5000);
    expect(onUpdate).not.toHaveBeenCalled();
    // Siguiente poll (15s): datos estáticos del mock, sin cambios
    await vi.advanceTimersByTimeAsync(15000);
    expect(onUpdate).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
});
