import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { uploadFile } from '../../../shared/storage/storage.service';
import { logAuditEvent } from '../../audit/application/audit.service';
import { getMockOrdersByDriver } from '../../../shared/lib/mockData';

let mockOnlineStatus = false;
const mockEarnings = { today: 18.50, week: 236.50, month: 892.30, balance: 127.40 };
const mockDeliveries: Array<{ id: string; orderId: string; imageUrl: string; notes: string; code: string; createdAt: string }> = [];
const mockLocations: Record<string, { lat: number; lng: number; created_at: string; user_id: string; order_id: string }> = {};

export interface DriverWorkOrder {
  id: string;
  total: number;
  status: string;
  delivery_address: string;
  notes: string | null;
  created_at: string;
  store_id: string;
  store_name: string;
  store_emoji: string;
  customer_name: string;
}

export interface AvailableDriverOrder extends DriverWorkOrder {
  distance_label: string;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  created_at: string;
}

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

export async function getDriverWorkOrders(driverId: string): Promise<DriverWorkOrder[]> {
  if (!isSupabaseReady) {
    const assigned = getMockOrdersByDriver(driverId);
    const source = assigned.length > 0 ? assigned : [{
      id: 'order-demo-driver',
      total: 4.58,
      status: 'picked_up',
      delivery_address: 'Av. Amazonas, Quito',
      notes: 'Entrega de ejemplo local',
      created_at: new Date().toISOString(),
      store_id: 'store-1',
      store: { name: 'Rayo Demo Market', emoji: 'RE' },
      customer: { full_name: 'Cliente Demo' },
    }];
    return source
      .filter((order) => !['delivered', 'cancelled', 'refunded'].includes(order.status))
      .map((order) => ({
        id: order.id,
        total: order.total,
        status: order.status,
        delivery_address: order.delivery_address,
        notes: order.notes ?? null,
        created_at: order.created_at,
        store_id: order.store_id,
        store_name: order.store?.name ?? 'Tienda',
        store_emoji: order.store?.emoji ?? 'RE',
        customer_name: order.customer?.full_name ?? 'Cliente',
      }));
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, delivery_address, notes, created_at, store_id, store:stores(name, emoji), customer:profiles!customer_id(full_name)')
    .eq('driver_id', driverId)
    .in('status', ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((order: Record<string, unknown>) => {
    const store = order.store as Record<string, unknown> | null;
    const customer = order.customer as Record<string, unknown> | null;
    return {
      id: order.id as string,
      total: Number(order.total ?? 0),
      status: order.status as string,
      delivery_address: order.delivery_address as string,
      notes: (order.notes as string | null) ?? null,
      created_at: order.created_at as string,
      store_id: order.store_id as string,
      store_name: (store?.name as string) ?? 'Tienda',
      store_emoji: (store?.emoji as string) ?? 'RE',
      customer_name: (customer?.full_name as string) ?? 'Cliente',
    };
  });
}

export async function getAvailableDriverOrders(): Promise<AvailableDriverOrder[]> {
  if (!isSupabaseReady) {
    return [{
      id: 'order-demo-available',
      total: 8.75,
      status: 'preparing',
      delivery_address: 'C. Manuelita Saenz, Quito',
      notes: 'Pedido demo disponible',
      created_at: new Date().toISOString(),
      store_id: 'store-1',
      store_name: 'Rayo Demo Market',
      store_emoji: 'RE',
      customer_name: 'Cliente Demo',
      distance_label: '1.8 km',
    }];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, delivery_address, notes, created_at, store_id, store:stores(name, emoji), customer:profiles!customer_id(full_name)')
    .is('driver_id', null)
    .in('status', ['accepted', 'preparing'])
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;

  return (data ?? []).map((order: Record<string, unknown>) => {
    const store = order.store as Record<string, unknown> | null;
    const customer = order.customer as Record<string, unknown> | null;
    return {
      id: order.id as string,
      total: Number(order.total ?? 0),
      status: order.status as string,
      delivery_address: order.delivery_address as string,
      notes: (order.notes as string | null) ?? null,
      created_at: order.created_at as string,
      store_id: order.store_id as string,
      store_name: (store?.name as string) ?? 'Tienda',
      store_emoji: (store?.emoji as string) ?? 'RE',
      customer_name: (customer?.full_name as string) ?? 'Cliente',
      distance_label: 'Cerca de ti',
    };
  });
}

export async function claimDriverOrder(orderId: string, driverId: string): Promise<DriverWorkOrder> {
  if (!isSupabaseReady) {
    return {
      id: orderId,
      total: 8.75,
      status: 'preparing',
      delivery_address: 'C. Manuelita Saenz, Quito',
      notes: 'Pedido demo disponible',
      created_at: new Date().toISOString(),
      store_id: 'store-1',
      store_name: 'Rayo Demo Market',
      store_emoji: 'RE',
      customer_name: 'Cliente Demo',
    };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('driver_claim_order', { p_order_id: orderId });
  if (error) throw error;
  if (!data) throw new Error('No se pudo tomar el pedido. Puede que otro repartidor ya lo acepto.');

  logAuditEvent({ userId: driverId, action: 'driver_claim_order', entityType: 'order', entityId: orderId }).catch(() => {});
  const claimed = Array.isArray(data) ? data[0] : data;
  const store = claimed.store as Record<string, unknown> | null;
  const customer = claimed.customer as Record<string, unknown> | null;

  return {
    id: claimed.id as string,
    total: Number(claimed.total ?? 0),
    status: claimed.status as string,
    delivery_address: claimed.delivery_address as string,
    notes: (claimed.notes as string | null) ?? null,
    created_at: claimed.created_at as string,
    store_id: claimed.store_id as string,
    store_name: (store?.name as string) ?? 'Tienda',
    store_emoji: (store?.emoji as string) ?? 'RE',
    customer_name: (customer?.full_name as string) ?? 'Cliente',
  };
}

export async function saveDriverLocation(driverId: string, orderId: string, lat: number, lng: number): Promise<DriverLocation> {
  const payload = { user_id: driverId, order_id: orderId, lat, lng };
  const createdAt = new Date().toISOString();
  mockLocations[orderId] = { ...payload, created_at: createdAt };
  if (!isSupabaseReady) return { lat, lng, created_at: createdAt };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('locations')
    .insert(payload)
    .select('lat, lng, created_at')
    .single();
  if (error) throw error;
  return {
    lat: Number(data.lat),
    lng: Number(data.lng),
    created_at: data.created_at,
  };
}

export async function getLatestOrderLocation(orderId: string): Promise<DriverLocation | null> {
  if (!isSupabaseReady) {
    const location = mockLocations[orderId];
    return location ? { lat: location.lat, lng: location.lng, created_at: location.created_at } : null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('locations')
    .select('lat, lng, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { lat: Number(data.lat), lng: Number(data.lng), created_at: data.created_at } : null;
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
