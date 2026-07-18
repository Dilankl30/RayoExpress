import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { createMockOrder, getMockOrders, getMockOrdersByStore, getMockOrdersByDriver, assignDriverToMockOrder } from '../../../shared/lib/mockData';
import { validateOrderInput, validateOrderStatus } from '../../../shared/validation/service-validators';
import { logAuditEvent } from '../../audit/application/audit.service';
import { DEFAULT_CHECKOUT_PRICING, getCheckoutPricing } from '../../app/application/app-config.service';
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

type ProductForDirectOrder = {
  id: string;
  store_id: string;
  name: string;
  price: number;
  emoji?: string | null;
  is_active?: boolean | null;
};

type StoreForDirectOrder = {
  id: string;
  is_open?: boolean | null;
  min_order?: number | null;
  delivery_fee?: number | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertRealOrderIdentifiers(params: CreateOrderParams) {
  if (!UUID_RE.test(params.storeId) || params.productIds.some((id) => !UUID_RE.test(id))) {
    throw new Error('Tu carrito tiene productos antiguos. Vacialo y agrega los productos nuevamente.');
  }
}

function assertMatchingItems(params: CreateOrderParams) {
  if (params.productIds.length !== params.quantities.length) {
    throw new Error('Las cantidades del carrito no coinciden con los productos.');
  }
  if (params.quantities.some((quantity) => !Number.isFinite(quantity) || quantity <= 0)) {
    throw new Error('El carrito tiene cantidades invalidas.');
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
    return new Error('Tu carrito tiene productos antiguos. Vacialo y agrega los productos nuevamente.');
  }
  if (raw.includes('UNAUTHENTICATED')) return new Error('Tu sesion expiro. Inicia sesion nuevamente para pedir.');
  if (raw.includes('ACCOUNT_SUSPENDED')) return new Error('Tu cuenta esta suspendida. Contacta a soporte.');
  if (raw.includes('STORE_NOT_FOUND')) return new Error('La tienda ya no esta disponible.');
  if (raw.includes('STORE_CLOSED')) return new Error('La tienda esta cerrada. Intenta con otra tienda disponible.');
  if (raw.includes('PRODUCT_NOT_FOUND')) return new Error('Uno de los productos ya no esta disponible. Actualiza tu carrito.');
  if (raw.includes('INSUFFICIENT_STOCK')) return new Error(raw.replace('INSUFFICIENT_STOCK: ', ''));
  if (raw.includes('MIN_ORDER')) return new Error(raw.replace('MIN_ORDER: ', ''));
  if (raw.includes('COUPON_INVALID')) return new Error('El cupon no es valido o ya expiro.');
  if (raw.includes('COUPON_LIMIT')) return new Error('Este cupon ya llego a su limite de uso.');
  if (raw.includes('COUPON_USED')) return new Error('Ya usaste este cupon.');
  if (raw.includes('COUPON_STORE')) return new Error('Este cupon pertenece a otra tienda.');
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return new Error('No tienes permiso para crear este pedido. Vuelve a iniciar sesion.');
  }

  return new Error(raw || 'Error al crear pedido');
}

function shouldFallbackToDirectOrderInsert(error: unknown): boolean {
  const raw = extractErrorMessage(error).toLowerCase();
  return raw.includes('create_order')
    || raw.includes('schema cache')
    || raw.includes('could not find the function')
    || raw.includes('function public.create_order')
    || raw.includes('p_delivery_lat')
    || raw.includes('p_delivery_lng');
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function createOrderDirect(params: CreateOrderParams): Promise<CreateOrderResult> {
  if (params.couponCode?.trim()) {
    throw new Error('No pudimos validar el cupon en este momento. Quita el cupon o intenta de nuevo.');
  }

  assertMatchingItems(params);
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) {
    throw new Error('Tu sesion expiro. Inicia sesion nuevamente para pedir.');
  }

  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id,is_open,min_order,delivery_fee')
    .eq('id', params.storeId)
    .maybeSingle();
  if (storeError) throw normalizeCreateOrderError(storeError);
  const store = storeData as StoreForDirectOrder | null;
  if (!store) throw new Error('La tienda ya no esta disponible.');
  if (store.is_open === false) throw new Error('La tienda esta cerrada. Intenta con otra tienda disponible.');

  const uniqueProductIds = [...new Set(params.productIds)];
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id,store_id,name,price,emoji,is_active')
    .in('id', uniqueProductIds);
  if (productsError) throw normalizeCreateOrderError(productsError);

  const productById = new Map((productsData as ProductForDirectOrder[] | null ?? []).map((product) => [product.id, product]));
  let subtotal = 0;
  const orderItems = params.productIds.map((productId, index) => {
    const product = productById.get(productId);
    if (!product || product.store_id !== params.storeId || product.is_active === false) {
      throw new Error('Uno de los productos ya no esta disponible. Actualiza tu carrito.');
    }

    const quantity = params.quantities[index];
    const unitPrice = Number(product.price);
    subtotal += unitPrice * quantity;
    return {
      product_id: product.id,
      product_name: product.name,
      product_emoji: product.emoji ?? null,
      quantity,
      unit_price: unitPrice,
    };
  });

  subtotal = roundMoney(subtotal);
  const minimum = Number(store.min_order ?? 0);
  if (minimum > 0 && subtotal < minimum) {
    throw new Error(`Pedido minimo $${minimum.toFixed(2)}.`);
  }

  let pricing = DEFAULT_CHECKOUT_PRICING;
  try {
    pricing = await getCheckoutPricing();
  } catch {
    pricing = DEFAULT_CHECKOUT_PRICING;
  }

  const deliveryFee = roundMoney(Math.max(Number.isFinite(pricing.deliveryFee) ? pricing.deliveryFee : Number(store.delivery_fee ?? 0), 0));
  const discount = 0;
  const tax = roundMoney(Math.max(subtotal - discount, 0) * pricing.taxRate);
  const total = roundMoney(Math.max(subtotal + deliveryFee + tax - discount, 0));

  const { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: userId,
      store_id: params.storeId,
      status: 'pending',
      payment_method: params.paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      tax,
      tip: 0,
      total,
      delivery_address: params.deliveryAddress,
      notes: params.notes ?? null,
    })
    .select('id,status')
    .single();
  if (orderError) throw normalizeCreateOrderError(orderError);

  const orderId = (insertedOrder as { id: string }).id;
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems.map((item) => ({ ...item, order_id: orderId })));
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderId);
    throw normalizeCreateOrderError(itemsError);
  }

  return {
    order_id: orderId,
    subtotal,
    delivery_fee: deliveryFee,
    discount,
    tax,
    tip: 0,
    total,
    status: (insertedOrder as { status?: string }).status ?? 'pending',
  };
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

function getCreateOrderRpcArgs(params: CreateOrderParams, includeCoordinates: boolean) {
  const args = {
    p_store_id: params.storeId,
    p_product_ids: params.productIds,
    p_quantities: params.quantities,
    p_delivery_address: params.deliveryAddress,
    p_payment_method: params.paymentMethod,
    p_coupon_code: params.couponCode ?? null,
    p_notes: params.notes ?? null,
    p_tip: 0,
  };

  if (!includeCoordinates) return args;

  return {
    ...args,
    p_delivery_lat: params.deliveryLat ?? null,
    p_delivery_lng: params.deliveryLng ?? null,
  };
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
  assertMatchingItems(params);
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
  let { data, error } = await supabase.rpc('create_order', getCreateOrderRpcArgs(params, true) as never);

  if (error && shouldFallbackToDirectOrderInsert(error)) {
    const retry = await supabase.rpc('create_order', getCreateOrderRpcArgs(params, false) as never);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (shouldFallbackToDirectOrderInsert(error)) return createOrderDirect(params);
    throw normalizeCreateOrderError(error);
  }

  const result = data as unknown as CreateOrderResult | null;
  if (!result?.order_id) return createOrderDirect(params);
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
