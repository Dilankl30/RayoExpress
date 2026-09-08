import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const POS_ROW = {
  tracking_code: 'RE-000123',
  lat: -0.464,
  lng: -76.988,
  updated_at: '2026-01-01T00:05:00.000Z',
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
            maybeSingle: async () => ({ data: { ...POS_ROW }, error: null }),
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

import { getCourierPosition, subscribeToCourierPosition } from '../courier-public.service';

describe('courier-public realtime (Fase 4)', () => {
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

  it('fetches from courier_positions mirror', async () => {
    const pos = await getCourierPosition('RE-000123');
    expect(fromCalls[0]).toBe('courier_positions');
    expect(pos).toMatchObject({ tracking_code: 'RE-000123', lat: -0.464, lng: -76.988 });
  });

  it('subscribes filtered by tracking_code and pushes first GPS fix', () => {
    const onUpdate = vi.fn();
    const sub = subscribeToCourierPosition('RE-000123', onUpdate, { pollIntervalMs: 60000 });
    expect(fakeChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'courier_positions', filter: 'tracking_code=eq.RE-000123' },
      expect.any(Function),
    );
    realtimeHandler?.({ new: { ...POS_ROW } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
    expect(removeChannel).toHaveBeenCalled();
  });

  it('notifies every movement (positions always change)', async () => {
    const onUpdate = vi.fn();
    const sub = subscribeToCourierPosition('RE-000123', onUpdate, { pollIntervalMs: 10000 });
    realtimeHandler?.({ new: { ...POS_ROW, lat: -0.4641, updated_at: '2026-01-01T00:06:00.000Z' } });
    realtimeHandler?.({ new: { ...POS_ROW, lat: -0.4642, updated_at: '2026-01-01T00:07:00.000Z' } });
    expect(onUpdate).toHaveBeenCalledTimes(2);
    sub.unsubscribe();
  });

  it('ignores invalid rows without breaking', () => {
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const sub = subscribeToCourierPosition('RE-000123', onUpdate, { pollIntervalMs: 60000, onError });
    realtimeHandler?.({ new: { tracking_code: 'RE-000123', lat: 'NaN', lng: null } });
    expect(onUpdate).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
});
