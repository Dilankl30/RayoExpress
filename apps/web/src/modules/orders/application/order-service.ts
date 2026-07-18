import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { createMockOrder, getMockOrders, getMockOrdersByStore, getMockOrdersByDriver, assignDriverToMockOrder } from '../../../shared/lib/mockData';
import { validateOrderInput, validateOrderStatus } from '../../../shared/validation/service-validators';
import { logAuditEvent } from '../../audit/application/audit.service';
import { canTransition } from '../domain/order-status.machine';
import type { Role } from '../../../shared/types';

export interface CreateOrderParams {
  storeId: string;
  productIds: string[];
  quantities: number[];
  deliveryAddress: string;
  paymentMethod: 'cash' | 'transfer';
  couponCode?: string;
  notes?: string;
  tip?: number;
  deliveryLat?: number;
  deliveryLng?: number;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertRealOrderIdentifiers(params: CreateOrderParams) {
  if (!UUID_RE.test(params.storeId) || params.productIds.some((id) => !UUID_RE.test(id))) {
    throw new Error('Tu carrito tiene productos antiguos. Vacíalo y agrega los productos nuevamente.');
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message ?? record.details ?? record.hint ?? record.code;
    if (typeof message === 'string') return message;
  }
  return 'Error al crear pedido';
}

function normalizeCreateOrderError(error: unknown): Error {
  const raw = extractErrorMessage(error);
  const lower = raw.toLowerCase();

  if (lower.includes('invalid input syntax for type uuid')) {
    return new Error('Tu carrito tiene productos antiguos. Vacíalo y agrega los productos nuevamente.');
  }
  if (raw.includes('UNAUTHENTICATED')) return new Error('Tu sesión expiró. Inicia sesión nuevamente para pedir.');
  if (raw.includes('ACCOUNT_SUSPENDED')) return new Error('Tu cuenta está suspendida. Contacta a soporte.');
  if (raw.includes('STORE_NOT_FOUND')) return new Error('La tienda ya no está disponible.');
  if (raw.includes('STORE_CLOSED')) return new Error('La tienda está cerrada. Intenta con otra tienda disponible.');
  if (raw.includes('PRODUCT_NOT_FOUND')) return new Error('Uno de los productos ya no está disponible. Actualiza tu carrito.');
  if (raw.includes('INSUFFICIENT_STOCK')) return new Error(raw.replace('INSUFFICIENT_STOCK: ', ''));
  if (raw.includes('MIN_ORDER')) return new Error(raw.replace('MIN_ORDER: ', ''));
  if (raw.includes('COUPON_INVALID')) return new Error('El cupón no es válido o ya expiró.');
  if (raw.includes('COUPON_LIMIT')) return new Error('Este cupón ya llegó a su límite de uso.');
  if (raw.includes('COUPON_USED')) return new Error('Ya usaste este cupón.');
  if (raw.includes('COUPON_STORE')) return new Error('Este cupón pertenece a otra tienda.');
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return new Error('No tienes permiso para crear este pedido. Vuelve a iniciar sesión.');
  }

  return new Error(raw || 'Error al crear pedido');
}

async function recordCouponRedemption(couponCode: string | undefined, orderId: string) {
  const normalizedCode = couponCode?.trim().toUpperCase();
  if (!normalizedCode || !orderId) return;

  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { data: promotion } = await supabase
    .from('promotions')
    .select('id')
    .eq('code', normalizedCode)
    .maybeSingle();

  const promotionId = (promotion as { id?: string } | null)?.id;
  if (!promotionId) return;

  await supabase
    .from('promotion_redemptions' as never)
    .insert({
      promotion_id: promotionId,
      user_id: userId,
      order_id: orderId,
    } as never);
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

  assertRealOrderIdentifiers(params);
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('create_order', {
    p_store_id: params.storeId,
    p_product_ids: params.productIds,
    p_quantities: params.quantities,
    p_delivery_address: params.deliveryAddress,
    p_payment_method: params.paymentMethod,
    p_coupon_code: params.couponCode ?? null,
    p_notes: params.notes ?? null,
    p_tip: 0,
    p_delivery_lat: params.deliveryLat ?? null,
    p_delivery_lng: params.deliveryLng ?? null,
  });

  if (error) throw normalizeCreateOrderError(error);
  const result = data as unknown as CreateOrderResult;
  recordCouponRedemption(params.couponCode, result.order_id).catch(() => {});
  return result;
}

export async function getOrderById(orderId: string) {
  if (!isSupabaseReady) {
    const allOrders = ['mock-customer', 'mock-driver', 'mock-store', 'mock-admin'].flatMap((userId) => getMockOrders(userId));
    return allOrders.find((order) => order.id === orderId) || null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*), customer:profiles!customer_id(full_name, phone), driver:profiles!driver_id(full_name, avatar_url), store:stores(name, emoji, latitude, longitude)')
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
    .select('*, order_items(*), store:stores(name, emoji, latitude, longitude)')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStoreOrders(storeId: string) {
  if (!isSupabaseReady) return getMockOrdersByStore(storeId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), customer:profiles!customer_id(full_name, phone), driver:profiles!driver_id(full_name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDriverOrders(driverId: string) {
  if (!isSupabaseReady) return getMockOrdersByDriver(driverId);

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

  if (!isSupabaseReady) {
    assignDriverToMockOrder(orderId, driverId);
    return { id: orderId, driver_id: driverId };
  }

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
