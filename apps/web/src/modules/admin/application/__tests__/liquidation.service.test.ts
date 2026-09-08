import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import {
  createLiquidation,
  getDriverSettlement,
  listLiquidations,
  markLiquidationPaid,
  periodsOverlap,
  validatePeriod,
} from '../liquidation.service';

describe('liquidation.service (Fase 7, mock)', () => {
  describe('periodsOverlap', () => {
    it('detects overlapping and adjacent periods', () => {
      expect(periodsOverlap('2026-09-01', '2026-09-07', '2026-09-07', '2026-09-14')).toBe(true);
      expect(periodsOverlap('2026-09-01', '2026-09-07', '2026-09-08', '2026-09-14')).toBe(false);
      expect(periodsOverlap('2026-09-01', '2026-09-30', '2026-09-10', '2026-09-12')).toBe(true);
    });
  });

  describe('validatePeriod', () => {
    it('rejects inverted or empty periods', () => {
      expect(() => validatePeriod('2026-09-08', '2026-09-01')).toThrow('anterior');
      expect(() => validatePeriod('', '2026-09-01')).toThrow('inicio y fin');
    });
  });

  describe('getDriverSettlement', () => {
    it('computes the 7 spec metrics with net = 75% + advances - collected', async () => {
      const s = await getDriverSettlement('mock-driver-1', '2026-09-01', '2026-09-07');
      expect(s.totals.orders).toBe(2);
      expect(s.totals.services).toBe(8);
      expect(s.totals.driver75).toBe(6);
      expect(s.totals.admin25).toBe(2);
      expect(s.totals.advances).toBe(34);
      // Solo el efectivo cobrado cuenta como recibido (transfer va al banco)
      expect(s.totals.collected).toBe(24);
      expect(s.totals.net).toBe(16);
    });
  });

  describe('create/list/pay', () => {
    it('saves pending, blocks overlaps, then closes with payment', async () => {
      const rec = await createLiquidation('mock-driver-9', '2026-09-01', '2026-09-07', 'Semana 1');
      expect(rec.status).toBe('pending');
      expect(rec.net_payable).toBe(16);

      await expect(createLiquidation('mock-driver-9', '2026-09-05', '2026-09-12')).rejects.toThrow('cubre ese período');

      const list = await listLiquidations('mock-driver-9');
      expect(list).toHaveLength(1);

      const paid = await markLiquidationPaid(rec.id);
      expect(paid.status).toBe('paid');
      expect(paid.paid_at).not.toBeNull();

      await expect(markLiquidationPaid(rec.id)).rejects.toThrow('pendientes');
    });
  });
});
