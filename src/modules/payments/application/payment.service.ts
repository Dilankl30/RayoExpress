import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { uploadFile } from '../../../shared/storage/storage.service';
import { validatePaymentMethod } from '../../../shared/validation/service-validators';
import { isPositiveNumber } from '../../../shared/validation';
import { logAuditEvent } from '../../audit/application/audit.service';

export interface PaymentTransaction {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  receipt_url: string | null;
  verified: boolean;
  verified_by: string | null;
  created_at: string;
}

const mockTransactions: PaymentTransaction[] = [];

export async function uploadReceipt(orderId: string, file: File): Promise<string> {
  const { path } = await uploadFile('receipts', orderId, file);
  if (!isSupabaseReady) return path;
  return path;
}

export async function savePaymentReceipt(orderId: string, method: string, amount: number, receiptUrl: string | null, userId = '') {
  if (!validatePaymentMethod(method)) throw new Error(`Método de pago inválido: ${method}`);
  if (!isPositiveNumber(amount)) throw new Error('Monto inválido');
  if (!isSupabaseReady) {
    const tx: PaymentTransaction = {
      id: `mock-pay-${Date.now()}`,
      order_id: orderId,
      method,
      amount,
      receipt_url: receiptUrl,
      verified: false,
      verified_by: null,
      created_at: new Date().toISOString(),
    };
    mockTransactions.push(tx);
    logAuditEvent({ userId, action: 'PAYMENT_CREATED', entityType: 'payment', entityId: tx.id, details: { orderId, method, amount } }).catch(() => {});
    return tx;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('payments')
    .insert({ order_id: orderId, method, amount, receipt_url: receiptUrl })
    .select()
    .single();
  if (error) throw error;
  logAuditEvent({ userId, action: 'PAYMENT_CREATED', entityType: 'payment', entityId: data.id, details: { orderId, method, amount } }).catch(() => {});
  return data;
}

export async function getPaymentsByOrder(orderId: string): Promise<PaymentTransaction[]> {
  if (!isSupabaseReady) return mockTransactions.filter((t) => t.order_id === orderId);
  const supabase = getSupabase();
  const { data, error } = await supabase.from('payments').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data ?? [];
}

export async function getStorePayments(storeId: string): Promise<PaymentTransaction[]> {
  if (!isSupabaseReady) return mockTransactions;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('payments')
    .select('*, orders!inner(store_id)')
    .eq('orders.store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function verifyPayment(paymentId: string, adminId: string, verified: boolean) {
  logAuditEvent({ userId: adminId, action: verified ? 'payment_verified' : 'payment_rejected', entityType: 'payment_transaction', entityId: paymentId }).catch(() => {});
  if (!isSupabaseReady) {
    const tx = mockTransactions.find((t) => t.id === paymentId);
    if (tx) { tx.verified = verified; tx.verified_by = adminId; }
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from('payments')
    .update({ verified, verified_by: adminId })
    .eq('id', paymentId);
  if (error) throw error;
}

export async function confirmPayment(paymentId: string, userId: string) {
  if (!isSupabaseReady) {
    const tx = mockTransactions.find((t) => t.id === paymentId);
    if (tx) { tx.verified = true; tx.verified_by = userId; }
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('payments').update({ verified: true, verified_by: userId }).eq('id', paymentId);
  if (error) throw error;
  logAuditEvent({ userId, action: 'PAYMENT_CONFIRMED', entityType: 'payment', entityId: paymentId }).catch(() => {});
}

export async function failPayment(paymentId: string, userId: string) {
  if (!isSupabaseReady) {
    const tx = mockTransactions.find((t) => t.id === paymentId);
    if (tx) { tx.verified = false; tx.verified_by = userId; }
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('payments').update({ verified: false, verified_by: userId }).eq('id', paymentId);
  if (error) throw error;
  logAuditEvent({ userId, action: 'PAYMENT_FAILED', entityType: 'payment', entityId: paymentId }).catch(() => {});
}

export async function initiateRefund(paymentId: string, userId: string, reason?: string) {
  if (!isSupabaseReady) {
    const tx = mockTransactions.find((t) => t.id === paymentId);
    if (tx) { tx.verified = false; tx.verified_by = userId; }
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('payments').update({ verified: false, verified_by: userId }).eq('id', paymentId);
  if (error) throw error;
  logAuditEvent({ userId, action: 'REFUND_INITIATED', entityType: 'payment', entityId: paymentId, details: { reason } }).catch(() => {});
}
