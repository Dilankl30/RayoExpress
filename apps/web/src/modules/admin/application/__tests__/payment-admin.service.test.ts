import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import { getPaidOrders, getPendingPaymentOrders, markOrderPaid } from '../payment-admin.service';

describe('payment-admin.service (Fase 5, mock)', () => {
  it('lists pending-payment orders (delivered + unpaid)', async () => {
    const pending = await getPendingPaymentOrders();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ tracking_code: 'RE-000123', status: 'delivered', total: 24 });
    // El cliente nunca ve campos internos: el tipo tampoco los expone
    expect(pending[0]).not.toHaveProperty('payment_status');
    expect(pending[0]).not.toHaveProperty('receiving_account_id');
  });

  it('requires a receiving account for transfers (even in mock)', async () => {
    await expect(markOrderPaid('mock-order-1', 'transfer')).rejects.toThrow('cuenta receptora');
  });

  it('marks cash payments without backend', async () => {
    await expect(markOrderPaid('mock-order-1', 'cash')).resolves.toEqual({ receiptUrl: null });
  });

  it('returns empty paid list in mock mode', async () => {
    await expect(getPaidOrders()).resolves.toEqual([]);
  });
});
