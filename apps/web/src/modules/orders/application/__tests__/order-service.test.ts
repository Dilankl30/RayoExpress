import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));

const mockCreateOrder = vi.hoisted(() => vi.fn());
const mockGetMockOrders = vi.hoisted(() => vi.fn().mockReturnValue([]));
const mockAssignDriverToMockOrder = vi.hoisted(() => vi.fn());

vi.mock('../../../../shared/lib/mockData', () => ({
  createMockOrder: mockCreateOrder,
  getMockOrders: mockGetMockOrders,
  assignDriverToMockOrder: mockAssignDriverToMockOrder,
}));

vi.mock('../../../audit/application/audit.service', () => ({
  logAuditEvent: vi.fn(),
}));

import { createOrder, updateOrderStatus, assignDriver } from '../order-service';

describe('createOrder', () => {
  const valid = {
    storeId: 'store-1',
    productIds: ['prod-1', 'prod-2'],
    quantities: [1, 2],
    deliveryAddress: 'Calle 123',
    paymentMethod: 'cash' as const,
  };

  it('throws when storeId is empty', async () => {
    await expect(createOrder({ ...valid, storeId: '' })).rejects.toThrow('ID de tienda requerido');
  });

  it('throws when deliveryAddress is empty', async () => {
    await expect(createOrder({ ...valid, deliveryAddress: '' })).rejects.toThrow('Direccion de entrega requerida');
  });

  it('throws when payment method is invalid', async () => {
    const invalidPaymentMethod = 'bitcoin' as never;
    await expect(createOrder({ ...valid, paymentMethod: invalidPaymentMethod })).rejects.toThrow('Metodo de pago invalido');
  });

  it('throws when productIds is empty', async () => {
    await expect(createOrder({ ...valid, productIds: [] })).rejects.toThrow('Debe incluir al menos un producto');
  });

  it('throws when quantities mismatch productIds', async () => {
    await expect(createOrder({ ...valid, quantities: [1] })).rejects.toThrow('Cantidades invalidas');
  });

  it('throws when quantity exceeds 100', async () => {
    await expect(createOrder({ ...valid, quantities: [1, 101] })).rejects.toThrow('Cantidad maxima excedida');
  });

  it('creates order with mock data when validation passes', async () => {
    mockCreateOrder.mockReturnValue({
      id: 'order-123',
      subtotal: 11.97,
      delivery_fee: 1.5,
      discount: 0,
      tax: 0.96,
      tip: 2,
      total: 16.43,
      status: 'pending',
    });
    const result = await createOrder({ ...valid, tip: 2 });
    expect(result.order_id).toBe('order-123');
    expect(result.status).toBe('pending');
    expect(result.total).toBe(16.43);
  });
});

describe('updateOrderStatus', () => {
  it('throws for invalid status', async () => {
    await expect(updateOrderStatus('order-1', 'invalid_status')).rejects.toThrow('Estado de pedido inválido');
  });

  it('throws when role cannot transition', async () => {
    mockGetMockOrders.mockReturnValue([{ id: 'order-1', status: 'pending' }]);
    await expect(updateOrderStatus('order-1', 'preparing', 'customer')).rejects.toThrow(/no puede cambiar/);
  });

  it('allows valid transition', async () => {
    const result = await updateOrderStatus('order-1', 'accepted', 'store');
    expect(result).toEqual({ id: 'order-1', status: 'accepted' });
  });
});

describe('assignDriver', () => {
  it('throws for customer role', async () => {
    await expect(assignDriver('order-1', 'driver-1', 'customer')).rejects.toThrow('Rol \'customer\' no puede asignar repartidores');
  });

  it('throws for driver role', async () => {
    await expect(assignDriver('order-1', 'driver-1', 'driver')).rejects.toThrow('Rol \'driver\' no puede asignar repartidores');
  });

  it('allows store to assign driver', async () => {
    const result = await assignDriver('order-1', 'driver-1', 'store');
    expect(result.driver_id).toBe('driver-1');
  });

  it('allows admin to assign driver', async () => {
    const result = await assignDriver('order-1', 'driver-1', 'admin');
    expect(result.driver_id).toBe('driver-1');
  });
});
