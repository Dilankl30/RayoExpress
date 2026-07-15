import { describe, it, expect, vi } from 'vitest';

const mockSupabaseReady = vi.hoisted(() => ({ value: false }));
const mockGetSupabase = vi.hoisted(() => vi.fn());

vi.mock('../../../../integrations/supabase/client', () => ({
  get isSupabaseReady() { return mockSupabaseReady.value; },
  getSupabase: mockGetSupabase,
}));

vi.mock('../../../../shared/storage/storage.service', () => ({
  uploadFile: vi.fn().mockResolvedValue({ path: 'receipts/test.pdf' }),
}));

vi.mock('../../../../shared/validation/service-validators', () => ({
  validatePaymentMethod: vi.fn((m: string) => ['cash', 'transfer', 'card'].includes(m)),
}));

vi.mock('../../../../shared/validation', () => ({
  isPositiveNumber: vi.fn((n: number) => typeof n === 'number' && n > 0),
}));

vi.mock('../../../audit/application/audit.service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { savePaymentReceipt, getPaymentsByOrder, uploadReceipt, verifyPayment } from '../payment.service';

describe('uploadReceipt', () => {
  it('returns a path string', async () => {
    const result = await uploadReceipt('order-1', new File([''], 'test.pdf'));
    expect(typeof result).toBe('string');
  });
});

describe('savePaymentReceipt', () => {
  it('creates a payment with valid data', async () => {
    const result = await savePaymentReceipt('order-1', 'transfer', 25.5, 'receipts/test.pdf');
    expect(result).toHaveProperty('id');
    expect(result.order_id).toBe('order-1');
    expect(result.method).toBe('transfer');
    expect(result.amount).toBe(25.5);
    expect(result.receipt_url).toBe('receipts/test.pdf');
    expect(result.verified).toBe(false);
  });

  it('throws for invalid payment method', async () => {
    await expect(savePaymentReceipt('order-1', 'invalid', 10, null)).rejects.toThrow('Método de pago inválido');
  });

  it('throws for non-positive amount', async () => {
    await expect(savePaymentReceipt('order-1', 'cash', -5, null)).rejects.toThrow('Monto inválido');
  });

  it('throws for zero amount', async () => {
    await expect(savePaymentReceipt('order-1', 'cash', 0, null)).rejects.toThrow('Monto inválido');
  });
});

describe('getPaymentsByOrder', () => {
  it('returns payments for an order', async () => {
    await savePaymentReceipt('order-1', 'cash', 10, null);
    const payments = await getPaymentsByOrder('order-1');
    expect(Array.isArray(payments)).toBe(true);
  });

  it('returns empty array when no payments exist', async () => {
    const payments = await getPaymentsByOrder('order-nonexistent');
    expect(payments).toHaveLength(0);
  });
});

describe('verifyPayment', () => {
  it('does not throw when verifying', async () => {
    await expect(verifyPayment('pay-1', 'admin-1', true)).resolves.toBeUndefined();
  });
});

describe('error handling', () => {
  it('throws when supabase save fails', async () => {
    mockSupabaseReady.value = true;
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockGetSupabase.mockReturnValue({ from: () => ({ insert: mockInsert }) });

    const { validatePaymentMethod } = await import('../../../../shared/validation/service-validators');
    vi.mocked(validatePaymentMethod).mockReturnValue(true);
    const { isPositiveNumber } = await import('../../../../shared/validation');
    vi.mocked(isPositiveNumber).mockReturnValue(true);

    await expect(savePaymentReceipt('order-1', 'cash', 10, null)).rejects.toThrow('Insert failed');
    mockSupabaseReady.value = false;
  });
});
