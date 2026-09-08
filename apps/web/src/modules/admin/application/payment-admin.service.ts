import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { logAuditEvent } from '../../audit/application/audit.service';
import { uploadFile } from '../../../shared/storage/storage.service';

export type AdminPaymentMethod = 'cash' | 'transfer';

export interface PendingPaymentOrder {
  id: string;
  tracking_code: string | null;
  customer_name: string | null;
  total: number;
  service_fee: number;
  driver_name: string | null;
  status: string;
  created_at: string;
}

export interface PaidOrder extends PendingPaymentOrder {
  payment_method: AdminPaymentMethod;
  account_name: string | null;
  transfer_receipt_url: string | null;
  updated_at: string;
}

export interface MarkPaidOptions {
  accountId?: string;
  receiptFile?: File;
  reference?: string;
}

type OrderWithRelations = {
  id: string;
  tracking_code: string | null;
  customer_name: string | null;
  total: number;
  service_fee: number;
  status: string;
  payment_method: AdminPaymentMethod;
  transfer_receipt_url: string | null;
  created_at: string;
  updated_at: string;
  driver?: { full_name?: string | null } | null;
  account?: { name?: string | null } | null;
};

function mapPending(row: OrderWithRelations): PendingPaymentOrder {
  return {
    id: row.id,
    tracking_code: row.tracking_code,
    customer_name: row.customer_name,
    total: Number(row.total ?? 0),
    service_fee: Number(row.service_fee ?? 0),
    driver_name: row.driver?.full_name ?? null,
    status: row.status,
    created_at: row.created_at,
  };
}

/** Pedidos ENTREGADOS con pago pendiente. Base de la cobranza. */
export async function getPendingPaymentOrders(limit = 100): Promise<PendingPaymentOrder[]> {
  if (!isSupabaseReady) {
    return [
      {
        id: 'mock-order-1',
        tracking_code: 'RE-000123',
        customer_name: 'Juan Pérez',
        total: 24,
        service_fee: 4,
        driver_name: 'Juan Carlos',
        status: 'delivered',
        created_at: new Date().toISOString(),
      },
    ];
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, tracking_code, customer_name, total, service_fee, status, created_at, driver:profiles!driver_id(full_name)')
    .eq('status', 'delivered')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as OrderWithRelations[]).map(mapPending);
}

/** Pedidos con pago registrado (efectivo o transferencia). */
export async function getPaidOrders(limit = 100): Promise<PaidOrder[]> {
  if (!isSupabaseReady) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, tracking_code, customer_name, total, service_fee, status, payment_method, transfer_receipt_url, created_at, updated_at, driver:profiles!driver_id(full_name), account:bank_accounts!receiving_account_id(name)',
    )
    .eq('payment_status', 'paid')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as OrderWithRelations[]).map((row) => ({
    ...mapPending(row),
    payment_method: row.payment_method,
    account_name: row.account?.name ?? null,
    transfer_receipt_url: row.transfer_receipt_url,
    updated_at: row.updated_at,
  }));
}

/**
 * Marca un pedido como pagado.
 * - Efectivo: solo cambia el estado de pago.
 * - Transferencia: exige cuenta receptora; comprobante y referencia opcionales
 *   (el comprobante se guarda en el bucket privado `receipts`).
 */
export async function markOrderPaid(
  orderId: string,
  method: AdminPaymentMethod,
  opts?: MarkPaidOptions,
): Promise<{ receiptUrl: string | null }> {
  if (method === 'transfer' && !opts?.accountId) {
    throw new Error('Selecciona la cuenta receptora de la transferencia.');
  }

  if (!isSupabaseReady) return { receiptUrl: null };

  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, total, payment_status')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('Pedido no encontrado.');
  const orderRow = order as unknown as { total: number; payment_status: string };
  if (orderRow.payment_status === 'paid') throw new Error('El pedido ya está marcado como pagado.');

  let receiptUrl: string | null = null;
  if (opts?.receiptFile) {
    const { path } = await uploadFile('receipts', orderId, opts.receiptFile);
    receiptUrl = path;
  }

  const reference = opts?.reference?.trim() || null;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: method,
      receiving_account_id: method === 'transfer' ? (opts?.accountId ?? null) : null,
      transfer_receipt_url: receiptUrl,
      updated_by: adminUserId,
    })
    .eq('id', orderId);
  if (updateError) throw updateError;

  await supabase.from('payments').insert({
    order_id: orderId,
    method,
    amount: Number(orderRow.total ?? 0),
    receipt_url: receiptUrl,
    verified: true,
    verified_by: adminUserId,
  });

  if (method === 'transfer' && reference) {
    await supabase.from('payment_transactions').insert({
      order_id: orderId,
      method: 'transfer',
      amount: Number(orderRow.total ?? 0),
      receipt_url: receiptUrl,
      provider: 'manual',
      provider_reference: reference,
      status: 'completed',
      verified: true,
      verified_by: adminUserId,
    });
  }

  await logAuditEvent({
    userId: adminUserId || '',
    action: 'order_payment_marked',
    entityType: 'order',
    entityId: orderId,
    details: { method, accountId: opts?.accountId ?? null, reference, hasReceipt: !!receiptUrl },
  }).catch(() => {});

  return { receiptUrl };
}
