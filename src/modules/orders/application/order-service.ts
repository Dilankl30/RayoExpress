import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { createMockOrder, getMockOrders } from '../../../shared/lib/mockData';
import { validateOrderInput, validateOrderStatus } from '../../../shared/validation/service-validators';
import { logAuditEvent } from '../../audit/application/audit.service';
import { canTransition } from '../domain/order-status.machine';
import type { Role } from '../../../shared/types';

export interface CreateOrderParams {
  storeId: string;
  productIds: string[];
  quantities: number[];
  deliveryAddress: string;
  paymentMethod: 'cash' | 'transfer' | 'card';
  couponCode?: string;
  notes?: string;
  tip?: number;
}

export interface CreateOrderResult {
  order_id: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  status: string;
}

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const validationError = validateOrderInput({
    storeId: params.storeId,
    deliveryAddress: params.deliveryAddress,
    paymentMethod: params.paymentMethod,
    productIds: params.productIds,
    quantities: params.quantities,
  });
  if (validationError) throw new Error(validationError);
  if (!isSupabaseReady) {
    const order = createMockOrder(params, 'mock-customer');
    return {
      order_id: order.id,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      discount: order.discount,
      tax: order.tax,
      tip: order.tip,
      total: order.total,
      status: order.status,
    };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('create_order', {
    p_store_id: params.storeId,
    p_product_ids: params.productIds,
    p_quantities: params.quantities,
    p_delivery_address: params.deliveryAddress,
    p_payment_method: params.paymentMethod,
    p_coupon_code: params.couponCode ?? null,
    p_notes: params.notes ?? null,
    p_tip: params.tip ?? 0,
  });

  if (error) throw error;
  return data as unknown as CreateOrderResult;
}

export async function getOrderById(orderId: string) {
  if (!isSupabaseReady) {
    const allOrders = ['mock-customer', 'mock-driver', 'mock-store', 'mock-admin'].flatMap(u => getMockOrders(u));
    return allOrders.find(o => o.id === orderId) || null;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*), driver:profiles!driver_id(full_name, avatar_url), store:stores(name, emoji)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyOrders(userId: string) {
  if (!isSupabaseReady) return getMockOrders(userId);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*, store:stores(name, emoji)')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStoreOrders(storeId: string) {
  if (!isSupabaseReady) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDriverOrders(driverId: string) {
  if (!isSupabaseReady) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(orderId: string, status: string, role?: Role, userId?: string) {
  if (!validateOrderStatus(status)) throw new Error(`Estado de pedido inválido: ${status}`);
  if (role) {
    const current = await getOrderById(orderId);
    if (current && !canTransition(current.status, status, role)) {
      throw new Error(`Rol '${role}' no puede cambiar el pedido de '${current.status}' a '${status}'`);
    }
  }
  if (!isSupabaseReady) return { id: orderId, status };
  if (userId) {
    logAuditEvent({ userId, action: 'order_status_changed', entityType: 'order', entityId: orderId, details: { newStatus: status } }).catch(() => {});
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function assignDriver(orderId: string, driverId: string, role?: Role) {
  if (role && role !== 'store' && role !== 'admin') {
    throw new Error(`Rol '${role}' no puede asignar repartidores`);
  }
  if (!isSupabaseReady) return { id: orderId, driver_id: driverId };
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .update({ driver_id: driverId })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
