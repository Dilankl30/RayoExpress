import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn() }),
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

import {
  estimateArrivalWindow,
  formatArrivalWindow,
  getCourierPosition,
  shouldShowMap,
  subscribeToCourierPosition,
} from '../courier-public.service';

describe('courier-public.service (Fase 4)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installMemoryStorage();
  });

  describe('shouldShowMap', () => {
    it('shows map only on picked_up, on_the_way, arrived', () => {
      expect(shouldShowMap('picked_up')).toBe(true);
      expect(shouldShowMap('on_the_way')).toBe(true);
      expect(shouldShowMap('arrived')).toBe(true);
      expect(shouldShowMap('confirmed')).toBe(false);
      expect(shouldShowMap('preparing')).toBe(false);
      expect(shouldShowMap('ready')).toBe(false);
      expect(shouldShowMap('delivered')).toBe(false);
      expect(shouldShowMap('cancelled')).toBe(false);
    });
  });

  describe('estimateArrivalWindow', () => {
    it('returns base window per status without distance', () => {
      expect(estimateArrivalWindow('on_the_way')).toEqual({ min: 8, max: 14 });
      expect(estimateArrivalWindow('picked_up')).toEqual({ min: 14, max: 20 });
      expect(estimateArrivalWindow('arrived')).toEqual({ min: 2, max: 5 });
    });

    it('tightens window when courier is close', () => {
      const w = estimateArrivalWindow('on_the_way', 0.5);
      expect(w).not.toBeNull();
      expect(w!.max).toBeLessThanOrEqual(14);
      expect(w!.min).toBeGreaterThanOrEqual(2);
    });

    it('returns null outside route statuses', () => {
      expect(estimateArrivalWindow('confirmed')).toBeNull();
      expect(estimateArrivalWindow('delivered')).toBeNull();
    });
  });

  describe('formatArrivalWindow', () => {
    it('formats ranges in Spanish without coordinates', () => {
      expect(formatArrivalWindow({ min: 8, max: 12 })).toBe('8–12 minutos');
      expect(formatArrivalWindow(null)).toBe('');
    });
  });

  describe('getCourierPosition (mock mode)', () => {
    it('returns a position for RE-000123 without exposing internals', async () => {
      const pos = await getCourierPosition('RE-000123');
      expect(pos).not.toBeNull();
      expect(pos!.tracking_code).toBe('RE-000123');
      expect(Number.isFinite(pos!.lat)).toBe(true);
      expect(Number.isFinite(pos!.lng)).toBe(true);
      expect(pos).not.toHaveProperty('user_id');
      expect(pos).not.toHaveProperty('order_id');
    });

    it('returns null when no GPS yet (unknown code)', async () => {
      await expect(getCourierPosition('RE-999999')).resolves.toBeNull();
    });

    it('rejects invalid format', async () => {
      await expect(getCourierPosition('MALO')).rejects.toThrow('Código inválido');
    });
  });

  describe('subscribeToCourierPosition (mock mode)', () => {
    it('throws for invalid codes', () => {
      expect(() => subscribeToCourierPosition('MALO', () => {})).toThrow('Código inválido');
    });

    it('returns an unsubscribe function', () => {
      const sub = subscribeToCourierPosition('RE-000123', () => {}, { pollIntervalMs: 60000 });
      expect(typeof sub.unsubscribe).toBe('function');
      sub.unsubscribe();
    });
  });
});
