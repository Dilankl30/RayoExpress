import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));

import { normalizeTrackingCode, isTrackingBlocked, getPublicOrderByTrackingCode } from '../tracking-public.service';

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

describe('tracking-public.service', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installMemoryStorage();
  });

  describe('normalizeTrackingCode', () => {
    it('accepts valid RE-XXXXXX codes', () => {
      expect(normalizeTrackingCode('RE-000123')).toBe('RE-000123');
      expect(normalizeTrackingCode('re-000123')).toBe('RE-000123');
      expect(normalizeTrackingCode('  RE-000123  ')).toBe('RE-000123');
    });

    it('rejects invalid codes', () => {
      expect(normalizeTrackingCode('')).toBeNull();
      expect(normalizeTrackingCode('ABC-123')).toBeNull();
      expect(normalizeTrackingCode('RE-123')).toBeNull();
      expect(normalizeTrackingCode('RE-ABCDEF')).toBeNull();
      expect(normalizeTrackingCode('OTRO-000123')).toBeNull();
    });
  });

  describe('getPublicOrderByTrackingCode', () => {
    it('rejects invalid format without hitting backend', async () => {
      await expect(getPublicOrderByTrackingCode('MALO')).rejects.toThrow('Código inválido');
    });

    it('returns mock order RE-000123 in mock mode', async () => {
      const order = await getPublicOrderByTrackingCode('RE-000123');
      expect(order.tracking_code).toBe('RE-000123');
      expect(order.total).toBe(24);
      expect(order.product_total).toBe(20);
      expect(order.service_fee).toBe(4);
      expect(order.driver_name).toBe('Juan Carlos');
    });

    it('never exposes private financial fields', async () => {
      const order = await getPublicOrderByTrackingCode('RE-000123');
      expect(order).not.toHaveProperty('payment_status');
      expect(order).not.toHaveProperty('receiving_account_id');
      expect(order).not.toHaveProperty('driver_advance');
      expect(order).not.toHaveProperty('customer_phone');
    });

    it('throws for unknown code', async () => {
      await expect(getPublicOrderByTrackingCode('RE-999999')).rejects.toThrow('No encontramos');
    });

    it('blocks after too many attempts', async () => {
      for (let i = 0; i < 10; i++) {
        try {
          await getPublicOrderByTrackingCode('RE-999999');
        } catch {
          /* expected */
        }
      }
      await expect(getPublicOrderByTrackingCode('RE-999999')).rejects.toThrow('Demasiados intentos');
      expect(isTrackingBlocked()).toBe(true);
    });
  });
});
