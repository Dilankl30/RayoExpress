import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabaseReady = vi.hoisted(() => ({ value: false }));
const mockGetSupabase = vi.hoisted(() => vi.fn());

vi.mock('../../../../integrations/supabase/client', () => ({
  get isSupabaseReady() { return mockSupabaseReady.value; },
  getSupabase: mockGetSupabase,
}));

vi.mock('../../../audit/application/audit.service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../shared/storage/storage.service', () => ({
  uploadFile: vi.fn().mockResolvedValue({ path: 'delivery-evidence/test.jpg', storagePath: 'storage/test.jpg' }),
}));

const mockGetMockOrdersByDriver = vi.hoisted(() => vi.fn());
vi.mock('../../../../shared/lib/mockData', () => ({
  getMockOrdersByDriver: mockGetMockOrdersByDriver,
}));

import { setDriverOnline, getDriverWorkOrders, claimDriverOrder } from '../driver.service';

describe('setDriverOnline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should toggle online/offline in mock mode', async () => {
    await setDriverOnline('driver-1', true);
    await setDriverOnline('driver-1', false);
  });

  it('should update in supabase when ready', async () => {
    mockSupabaseReady.value = true;
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockGetSupabase.mockReturnValue({ from: () => ({ update: mockUpdate }) });

    await setDriverOnline('driver-1', true);

    expect(mockUpdate).toHaveBeenCalledWith({ is_online: true });
  });
});

describe('getDriverWorkOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should return mock work orders when supabase is not ready', async () => {
    mockGetMockOrdersByDriver.mockReturnValue([]);
    const orders = await getDriverWorkOrders('driver-1');
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0]).toHaveProperty('store_name');
  });

  it('should return active driver orders when supabase is ready', async () => {
    mockSupabaseReady.value = true;
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq = vi.fn().mockReturnValue({ in: mockIn });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockGetSupabase.mockReturnValue({ from: () => ({ select: mockSelect }) });

    const orders = await getDriverWorkOrders('driver-1');
    expect(Array.isArray(orders)).toBe(true);
  });
});

describe('claimDriverOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should assign delivery in mock mode', async () => {
    const result = await claimDriverOrder('order-1', 'driver-1');
    expect(result.id).toBe('order-1');
    expect(result).toHaveProperty('store_name');
    expect(result).toHaveProperty('customer_name');
  });

  it('should handle errors when claiming fails', async () => {
    mockSupabaseReady.value = true;
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockRpc = vi.fn().mockReturnValue({ single: mockSingle });
    mockGetSupabase.mockReturnValue({ rpc: mockRpc });

    await expect(claimDriverOrder('order-1', 'driver-1')).rejects.toThrow('No se pudo tomar el pedido');
  });
});
