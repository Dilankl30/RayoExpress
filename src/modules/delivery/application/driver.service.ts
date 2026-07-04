import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { validateFile } from '../../../shared/validation/service-validators';
import { logAuditEvent } from '../../audit/application/audit.service';

let mockOnlineStatus = false;
const mockEarnings = { today: 18.50, week: 236.50, month: 892.30, balance: 127.40 };
const mockDeliveries: Array<{ id: string; orderId: string; imageUrl: string; notes: string; code: string; createdAt: string }> = [];

export async function getDriverProfile(driverId: string) {
  if (!isSupabaseReady) {
    return { id: driverId, is_online: mockOnlineStatus, rating: 4.92, delivery_count: 1247, vehicle_type: 'moto', vehicle_plate: 'ABC-1234' };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('drivers').select('*').eq('id', driverId).single();
  if (error) throw error;
  return data;
}

export async function setDriverOnline(driverId: string, online: boolean) {
  mockOnlineStatus = online;
  logAuditEvent({ userId: driverId, action: online ? 'driver_online' : 'driver_offline', entityType: 'driver', entityId: driverId }).catch(() => {});
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const { error } = await supabase.from('drivers').update({ is_online: online }).eq('id', driverId);
  if (error) throw error;
}

export async function getDriverEarnings(driverId: string) {
  if (!isSupabaseReady) return mockEarnings;
  const supabase = getSupabase();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('total, tip, created_at')
    .eq('driver_id', driverId)
    .eq('status', 'delivered');
  if (error) throw error;
  const now = new Date();
  const today = orders?.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === now.toDateString()) || [];
  const thisWeek = orders?.filter((o: { created_at: string }) => { const d = new Date(o.created_at); const diff = now.getTime() - d.getTime(); return diff < 7 * 86400000; }) || [];
  const thisMonth = orders?.filter((o: { created_at: string }) => { const d = new Date(o.created_at); const diff = now.getTime() - d.getTime(); return diff < 30 * 86400000; }) || [];
  return {
    today: today.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0),
    week: thisWeek.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0),
    month: thisMonth.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0),
    balance: thisMonth.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0) * 0.85,
  };
}

export async function uploadDeliveryEvidence(orderId: string, driverId: string, file: File, notes: string) {
  const fileError = validateFile(file, 10);
  if (fileError) throw new Error(fileError);
  if (!isSupabaseReady) {
    const evidence = { id: `mock-ev-${Date.now()}`, orderId, imageUrl: URL.createObjectURL(file), notes, code: Math.random().toString(36).slice(2, 8).toUpperCase(), createdAt: new Date().toISOString() };
    mockDeliveries.push(evidence);
    return evidence;
  }
  const supabase = getSupabase();
  const ext = file.name.split('.').pop();
  const path = `delivery-evidence/${orderId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('delivery-evidence').upload(path, file);
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from('delivery-evidence').getPublicUrl(path);
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('delivery_evidence')
    .insert({ order_id: orderId, driver_id: driverId, image_url: urlData.publicUrl, notes })
    .select()
    .single();
  if (error) throw error;
  return { ...data, code };
}
