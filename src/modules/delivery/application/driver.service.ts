import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { uploadFile } from '../../../shared/storage/storage.service';
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

export interface WeeklyEarnings {
  day: string;
  earnings: number;
  orders: number;
}

export async function getDriverWeeklyHistory(driverId: string): Promise<WeeklyEarnings[]> {
  if (!isSupabaseReady) {
    return [
      { day: 'L', earnings: 24, orders: 8 }, { day: 'M', earnings: 31, orders: 11 },
      { day: 'X', earnings: 28, orders: 9 }, { day: 'J', earnings: 38, orders: 13 },
      { day: 'V', earnings: 45, orders: 16 }, { day: 'S', earnings: 52, orders: 18 },
      { day: 'D', earnings: 18, orders: 6 },
    ];
  }
  const supabase = getSupabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('created_at', weekAgo.toISOString());
  if (error) throw error;

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const buckets: Record<string, { earnings: number; orders: number }> = {};
  for (const d of dayNames) buckets[d] = { earnings: 0, orders: 0 };

  for (const row of (data || []) as { total: number; created_at: string }[]) {
    const dayIdx = new Date(row.created_at).getDay();
    buckets[dayNames[dayIdx]].earnings += row.total || 0;
    buckets[dayNames[dayIdx]].orders += 1;
  }

  return dayNames.map((day) => ({ day, earnings: Math.round(buckets[day].earnings * 100) / 100, orders: buckets[day].orders }));
}

export async function getDriverOrdersToday(driverId: string) {
  if (!isSupabaseReady) {
    return [
      { id: 'ord-1', store_name: 'KFC', store_emoji: '🍗', total: 4.2, status: 'delivered', created_at: new Date().toISOString(), distance: '1.8 km' },
      { id: 'ord-2', store_name: 'Subway', store_emoji: '🥪', total: 3.5, status: 'delivered', created_at: new Date().toISOString(), distance: '2.1 km' },
    ];
  }
  const supabase = getSupabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at, store:stores(name, emoji)')
    .eq('driver_id', driverId)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((o: Record<string, unknown>) => ({
    id: o.id as string,
    store_name: ((o.store as Record<string, unknown>)?.name as string) ?? '',
    store_emoji: ((o.store as Record<string, unknown>)?.emoji as string) ?? '',
    total: o.total as number,
    status: o.status as string,
    created_at: o.created_at as string,
  }));
}

export async function getDriverTripCount(driverId: string): Promise<number> {
  if (!isSupabaseReady) return 1247;
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .eq('status', 'delivered');
  if (error) throw error;
  return count ?? 0;
}

export async function uploadDeliveryEvidence(orderId: string, driverId: string, file: File, notes: string) {
  const { path, storagePath } = await uploadFile('delivery-evidence', orderId, file);
  if (!isSupabaseReady) {
    const evidence = { id: `mock-ev-${Date.now()}`, orderId, imageUrl: storagePath, notes, code: Math.random().toString(36).slice(2, 8).toUpperCase(), createdAt: new Date().toISOString() };
    mockDeliveries.push(evidence);
    return evidence;
  }
  const supabase = getSupabase();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('delivery_evidence')
    .insert({ order_id: orderId, driver_id: driverId, image_url: path, notes })
    .select()
    .single();
  if (error) throw error;
  return { ...data, code };
}
