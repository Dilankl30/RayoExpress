import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export type OrderChangeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ProposedOrderItem {
  productName: string;
  action: 'replace' | 'remove';
  quantity?: number;
  replacementName?: string;
  replacementPrice?: number;
  notes?: string;
}

export interface OrderChangeRequest {
  id: string;
  order_id: string;
  store_id: string;
  customer_id: string;
  requested_by: string | null;
  status: OrderChangeStatus;
  reason: string;
  proposed_items: ProposedOrderItem[];
  price_delta: number;
  new_total: number | null;
  customer_note: string | null;
  created_at: string;
  responded_at: string | null;
}

interface CreateChangeParams {
  orderId: string;
  storeId: string;
  userId: string;
  reason: string;
  proposedItems: ProposedOrderItem[];
  priceDelta?: number;
  newTotal?: number | null;
}

const mockChanges: OrderChangeRequest[] = [];

export async function getPendingChangeForOrder(orderId: string): Promise<OrderChangeRequest | null> {
  if (!isSupabaseReady) {
    return mockChanges.find((change) => change.order_id === orderId && change.status === 'pending') ?? null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('order_change_requests')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  return (data as OrderChangeRequest | null) ?? null;
}

export async function createOrderChangeRequest(params: CreateChangeParams): Promise<OrderChangeRequest> {
  if (!params.reason.trim()) throw new Error('Agrega una razon para el cambio');
  if (params.proposedItems.length === 0) throw new Error('Agrega al menos un producto afectado');

  if (!isSupabaseReady) {
    const change: OrderChangeRequest = {
      id: `change-${Date.now()}`,
      order_id: params.orderId,
      store_id: params.storeId,
      customer_id: 'mock-customer',
      requested_by: params.userId,
      status: 'pending',
      reason: params.reason,
      proposed_items: params.proposedItems,
      price_delta: params.priceDelta ?? 0,
      new_total: params.newTotal ?? null,
      customer_note: null,
      created_at: new Date().toISOString(),
      responded_at: null,
    };
    mockChanges.unshift(change);
    return change;
  }

  const supabase = getSupabase();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('customer_id, store_id, total')
    .eq('id', params.orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('No se encontro el pedido');

  const priceDelta = params.priceDelta ?? 0;
  const newTotal = params.newTotal ?? Number(order.total ?? 0) + priceDelta;
  const { data, error } = await supabase
    .from('order_change_requests')
    .insert({
      order_id: params.orderId,
      store_id: (order.store_id as string | null) ?? params.storeId,
      customer_id: order.customer_id as string,
      requested_by: params.userId,
      status: 'pending',
      reason: params.reason,
      proposed_items: params.proposedItems,
      price_delta: priceDelta,
      new_total: newTotal,
    })
    .select()
    .single();
  if (error) throw error;
  const updated = data as OrderChangeRequest;
  if (status === 'accepted' && updated.new_total !== null) {
    await supabase
      .from('orders')
      .update({ total: updated.new_total })
      .eq('id', updated.order_id);
  }
  return updated;
}

export async function respondToOrderChangeRequest(
  changeId: string,
  status: Extract<OrderChangeStatus, 'accepted' | 'rejected'>,
  userId: string,
  customerNote?: string,
): Promise<OrderChangeRequest> {
  if (!isSupabaseReady) {
    const change = mockChanges.find((item) => item.id === changeId);
    if (!change) throw new Error('No se encontro la propuesta');
    change.status = status;
    change.customer_note = customerNote ?? null;
    change.responded_at = new Date().toISOString();
    return change;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('order_change_requests')
    .update({
      status,
      customer_note: customerNote ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', changeId)
    .eq('customer_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as OrderChangeRequest;
}
