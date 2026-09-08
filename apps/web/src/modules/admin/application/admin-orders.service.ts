import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { logAuditEvent } from '../../audit/application/audit.service';
import { canTransition, type OrderStatus as OrderStatusType } from '../../../modules/orders/domain/order-status.machine';
import type { Role } from '../../../shared/types';

export interface AdminCreateOrderParams {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryReference?: string;
  orderDescription: string;
  storeName: string;
  storeAddress?: string;
  productTotal: number;
  serviceFee: number;
  otherCharges?: number;
  discountAmount?: number;
  paymentMethod: 'cash' | 'transfer';
  receivingAccountId?: string;
  driverId?: string;
  notes?: string;
}

export interface CreateOrderResult {
  orderId: string;
  trackingCode: string;
  total: number;
  messageClient: string;
  messageDriver: string;
  status: string;
}

function formatCurrency(n: number): string {
  return Number(n).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function generateWhatsAppMessage(
  trackingCode: string,
  description: string,
  productTotal: number,
  serviceFee: number,
  total: number,
  otherCharges?: number,
  discountAmount?: number,
): string {
  const discountStr = discountAmount && discountAmount > 0 ? `\n💰 Descuento: -${formatCurrency(discountAmount)}` : '';
  const otherStr = otherCharges && otherCharges > 0 ? `\n📦 Otros cargos: ${formatCurrency(otherCharges)}` : '';

  return `Hola 👋

Tu pedido en RayoExpress ha sido confirmado.

🧾 Pedido: ${trackingCode}

🛍️ Pedido:
${description}

💰 Total de productos: ${formatCurrency(productTotal)}
${otherStr}
💰 Servicio RayoExpress: ${formatCurrency(serviceFee)}${discountStr}
💰 TOTAL: ${formatCurrency(total)}

Puedes consultar el estado de tu pedido en:

rayoexpress.online/seguimiento

Ingresa tu código:

${trackingCode}

Gracias por confiar en RayoExpress ⚡`;
}

function generateDriverMessage(
  trackingCode: string,
  description: string,
  productTotal: number,
  serviceFee: number,
  total: number,
  customerName: string,
  customerPhone: string,
  deliveryAddress: string,
): string {
  return `Pedido ${trackingCode}

Cliente: ${customerName}
📱 Teléfono: ${customerPhone}
📍 Dirección: ${deliveryAddress}

🛍️ Detalle del pedido:
${description}

💰 Total productos: ${formatCurrency(productTotal)}
💰 Servicio RayoExpress: ${formatCurrency(serviceFee)}
💰 TOTAL: ${formatCurrency(total)}

Cuando entregues me confirmas.
Gracias.`;
}

export async function createOrderAdmin(params: AdminCreateOrderParams): Promise<CreateOrderResult> {
  const total = roundMoney(
    Number(params.productTotal) +
    Number(params.serviceFee) +
    (Number(params.otherCharges) || 0) -
    (Number(params.discountAmount) || 0)
  );

  if (!isSupabaseReady) {
    const mockId = 'mock-order-' + Date.now();
    const trackingCode = `RE-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const messageClient = generateWhatsAppMessage(trackingCode, params.orderDescription, params.productTotal, params.serviceFee, total, params.otherCharges, params.discountAmount);
    const messageDriver = generateDriverMessage(trackingCode, params.orderDescription, params.productTotal, params.serviceFee, total, params.customerName, params.customerPhone, params.deliveryAddress);
    return {
      orderId: mockId,
      trackingCode,
      total,
      messageClient,
      messageDriver,
      status: 'confirmed',
    };
  }

  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id;
  if (!adminUserId) {
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }

  await supabase.from('profiles').select('id, role').eq('id', params.driverId || '').maybeSingle();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: adminUserId,
      store_id: null,
      driver_id: params.driverId || null,
      status: 'confirmed',
      payment_method: params.paymentMethod,
      payment_status: 'pending',
      product_total: params.productTotal,
      service_fee: params.serviceFee,
      other_charges: params.otherCharges || 0,
      discount_amount: params.discountAmount || 0,
      tax: 0,
      tip: 0,
      total,
      delivery_address: params.deliveryAddress,
      delivery_reference: params.deliveryReference || null,
      customer_name: params.customerName,
      customer_phone: params.customerPhone || null,
      store_name: params.storeName,
      store_address: params.storeAddress || null,
      order_description: params.orderDescription,
      notes: params.notes || null,
      created_by: adminUserId,
      updated_by: adminUserId,
    })
    .select('id')
    .single();
  if (error) throw error;

  const orderId = (data as { id: string }).id;
  const trackingCode = `RE-${String(Math.floor(Math.random() * 900000) + 100000)}`;

  await supabase.from('orders').update({ tracking_code: trackingCode }).eq('id', orderId);

  await logAuditEvent({
    userId: adminUserId,
    action: 'order_created_admin',
    entityType: 'order',
    entityId: orderId,
    details: { trackingCode, total, productTotal: params.productTotal, serviceFee: params.serviceFee, paymentMethod: params.paymentMethod },
  }).catch(() => {});

  const messageClient = generateWhatsAppMessage(trackingCode, params.orderDescription, params.productTotal, params.serviceFee, total, params.otherCharges, params.discountAmount);
  const messageDriver = generateDriverMessage(trackingCode, params.orderDescription, params.productTotal, params.serviceFee, total, params.customerName, params.customerPhone, params.deliveryAddress);

  return { orderId, trackingCode, total, messageClient, messageDriver, status: 'confirmed' };
}

export async function updateOrderStatusAdmin(
  orderId: string,
  newStatus: string,
  role: Role = 'admin',
): Promise<void> {
  if (!validateOrderStatus(newStatus)) {
    throw new Error(`Estado inválido: ${newStatus}`);
  }

  if (!isSupabaseReady) return;

  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id;

  const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).maybeSingle();
  const orderStatus = order?.status as OrderStatusType | undefined;
  if (order && orderStatus && !canTransition(orderStatus, newStatus as OrderStatusType, role)) {
    throw new Error(`No puedes cambiar el estado de '${order.status}' a '${newStatus}'`);
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_by: adminUserId || null })
    .eq('id', orderId);
  if (updateError) throw updateError;

  await logAuditEvent({
    userId: adminUserId || '',
    action: 'order_status_changed',
    entityType: 'order',
    entityId: orderId,
    details: { newStatus },
  }).catch(() => {});
}

export async function markOrderPaid(
  orderId: string,
  method: 'cash' | 'transfer',
  accountId?: string,
): Promise<void> {
  if (!isSupabaseReady) return;

  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id;

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', payment_method: method, receiving_account_id: accountId || null, updated_by: adminUserId || null })
    .eq('id', orderId);
  if (error) throw error;

  await logAuditEvent({
    userId: adminUserId || '',
    action: 'order_payment_marked',
    entityType: 'order',
    entityId: orderId,
    details: { method, accountId },
  }).catch(() => {});
}

export function generateWhatsAppMessageForOrder(
  trackingCode: string,
  description: string,
  productTotal: number,
  serviceFee: number,
  total: number,
): string {
  return generateWhatsAppMessage(trackingCode, description, productTotal, serviceFee, total);
}

export function generateWhatsAppMessageForDriver(
  trackingCode: string,
  description: string,
  productTotal: number,
  serviceFee: number,
  total: number,
  customerName: string,
  customerPhone: string,
  deliveryAddress: string,
): string {
  return generateDriverMessage(trackingCode, description, productTotal, serviceFee, total, customerName, customerPhone, deliveryAddress);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateOrderStatus(status: string): boolean {
  return ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'cancelled'].includes(status);
}
