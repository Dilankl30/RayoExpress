import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import { ADMIN_SHARE, buildDailySummary, dayBounds, DRIVER_SHARE, getDailySummary } from '../daily-summary.service';

describe('daily-summary.service (Fase 6)', () => {
  describe('shares', () => {
    it('splits 25/75', () => {
      expect(ADMIN_SHARE).toBe(0.25);
      expect(DRIVER_SHARE).toBe(0.75);
    });
  });

  describe('dayBounds', () => {
    it('returns local day key and UTC range', () => {
      const { start, end, key } = dayBounds(new Date(2026, 8, 8, 12, 0, 0));
      expect(key).toBe('2026-09-08');
      expect(new Date(end).getTime() - new Date(start).getTime()).toBe(86_400_000);
    });
  });

  describe('buildDailySummary', () => {
    it('excludes cancelled orders from every metric', () => {
      const s = buildDailySummary('2026-09-08', [
        { status: 'delivered', product_total: 20, service_fee: 4, total: 24, payment_status: 'paid', driver_advance: 0, driver_id: 'd1', driver: { full_name: 'Juan' } },
        { status: 'cancelled', product_total: 100, service_fee: 50, total: 150, payment_status: 'pending', driver_advance: 0, driver_id: null, driver: null },
      ]);
      expect(s.orders.total).toBe(1);
      expect(s.economic.services).toBe(4);
      expect(s.economic.products).toBe(20);
    });

    it('applies 25/75 ONLY on services, never on products', () => {
      const s = buildDailySummary('2026-09-08', [
        { status: 'delivered', product_total: 430, service_fee: 85, total: 515, payment_status: 'paid', driver_advance: 0, driver_id: 'd1', driver: { full_name: 'Juan' } },
      ]);
      expect(s.distribution.admin25).toBe(21.25);
      expect(s.distribution.drivers75).toBe(63.75);
    });

    it('splits received vs pending by payment_status (independent of order status)', () => {
      const s = buildDailySummary('2026-09-08', [
        { status: 'delivered', product_total: 10, service_fee: 2, total: 12, payment_status: 'paid', driver_advance: 0, driver_id: null, driver: null },
        { status: 'delivered', product_total: 10, service_fee: 2, total: 12, payment_status: 'pending', driver_advance: 5, driver_id: null, driver: null },
      ]);
      expect(s.economic.received).toBe(12);
      expect(s.economic.pendingAmount).toBe(12);
      expect(s.economic.advances).toBe(5);
    });

    it('groups by driver without mixing values', () => {
      const s = buildDailySummary('2026-09-08', [
        { status: 'delivered', product_total: 20, service_fee: 40, total: 60, payment_status: 'paid', driver_advance: 0, driver_id: 'd1', driver: { full_name: 'Juan' } },
        { status: 'delivered', product_total: 10, service_fee: 30, total: 40, payment_status: 'paid', driver_advance: 0, driver_id: 'd2', driver: { full_name: 'Pedro' } },
      ]);
      expect(s.byDriver).toHaveLength(2);
      expect(s.byDriver[0]).toMatchObject({ driver_name: 'Juan', orders: 1, services: 40, share75: 30 });
      expect(s.byDriver[1]).toMatchObject({ driver_name: 'Pedro', orders: 1, services: 30, share75: 22.5 });
    });

    it('counts in-transit vs pending states', () => {
      const s = buildDailySummary('2026-09-08', [
        { status: 'confirmed', product_total: 0, service_fee: 0, total: 0, payment_status: 'pending', driver_advance: 0, driver_id: null, driver: null },
        { status: 'on_the_way', product_total: 0, service_fee: 0, total: 0, payment_status: 'pending', driver_advance: 0, driver_id: null, driver: null },
        { status: 'arrived', product_total: 0, service_fee: 0, total: 0, payment_status: 'pending', driver_advance: 0, driver_id: null, driver: null },
      ]);
      expect(s.orders).toMatchObject({ total: 3, delivered: 0, inTransit: 2, pending: 1 });
    });
  });

  describe('getDailySummary (mock)', () => {
    it('returns spec-coherent demo numbers', async () => {
      const s = await getDailySummary(new Date());
      expect(s.orders).toMatchObject({ total: 25, delivered: 20, inTransit: 3, pending: 2 });
      expect(s.economic.products).toBe(430);
      expect(s.economic.services).toBe(85);
      expect(s.distribution).toEqual({ admin25: 21.25, drivers75: 63.75 });
    });
  });
});
