import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

// ── Types ──
export interface AdminUser {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  role: string; is_suspended: boolean; created_at: string; last_sign_in: string | null;
}

export interface AdminStore {
  store_id: string; store_name: string; is_open: boolean; emoji: string;
  min_order: number; delivery_fee: number; owner_name: string | null;
  owner_phone: string | null; owner_email: string | null; created_at: string;
  total_orders: number; total_revenue: number; avg_order_value: number; product_count: number;
}

export interface AdminDriver {
  driver_id: string; full_name: string | null; phone: string | null;
  is_suspended: boolean; is_online: boolean; approved: boolean; rating: number;
  vehicle_type: string | null; vehicle_plate: string | null; driver_since: string;
  total_deliveries: number; total_earned: number; avg_rating: number;
}

export interface DriverDetail {
  driver: Record<string, unknown>; profile: Record<string, unknown>;
  recent_orders: Record<string, unknown>[]; stats: { total_deliveries: number; total_earned: number; avg_rating: number };
}

export interface StoreDetail {
  store: Record<string, unknown>; owner: Record<string, unknown>;
  products: Record<string, unknown>[]; recent_orders: Record<string, unknown>[];
  stats: { total_orders: number; total_revenue: number; avg_order_value: number };
}

export interface ActivityItem {
  type: string; id: string; status: string | null; total: number | null;
  created_at: string; customer_name: string | null; store_name: string | null; details: string | null;
}

// ── Mock data ──
const mockUsers: AdminUser[] = [
  { id: 'u1', full_name: 'Carlos Pérez', email: 'carlos@mail.com', phone: '0999999991', role: 'customer', is_suspended: false, created_at: new Date().toISOString(), last_sign_in: null },
  { id: 'u2', full_name: 'María García', email: 'maria@mail.com', phone: '0999999992', role: 'customer', is_suspended: false, created_at: new Date().toISOString(), last_sign_in: null },
  { id: 'u3', full_name: 'Luis Martínez', email: 'luis@mail.com', phone: '0999999993', role: 'driver', is_suspended: false, created_at: new Date().toISOString(), last_sign_in: null },
  { id: 'u5', full_name: 'Ana Rodríguez', email: 'ana@mail.com', phone: '0999999994', role: 'driver', is_suspended: false, created_at: new Date().toISOString(), last_sign_in: null },
  { id: 'u6', full_name: 'Pizzería Napoli', email: 'napoli@mail.com', phone: '0999999995', role: 'store', is_suspended: false, created_at: new Date().toISOString(), last_sign_in: null },
];

const mockStores: AdminStore[] = [
  { store_id: 's1', store_name: 'Pizzería Napoli', is_open: true, emoji: '🍕', min_order: 5, delivery_fee: 1.5, owner_name: 'Carlos Pérez', owner_phone: '0999999991', owner_email: 'carlos@mail.com', created_at: new Date().toISOString(), total_orders: 342, total_revenue: 12840, avg_order_value: 37.54, product_count: 15 },
  { store_id: 's2', store_name: 'Sushi House', is_open: false, emoji: '🍣', min_order: 10, delivery_fee: 2, owner_name: 'María García', owner_phone: '0999999992', owner_email: 'maria@mail.com', created_at: new Date().toISOString(), total_orders: 189, total_revenue: 9450, avg_order_value: 50, product_count: 22 },
];

const mockDrivers: AdminDriver[] = [
  { driver_id: 'd1', full_name: 'Luis Martínez', phone: '0999999993', is_suspended: false, is_online: true, approved: true, rating: 4.8, vehicle_type: 'moto', vehicle_plate: 'ABC-123', driver_since: new Date().toISOString(), total_deliveries: 156, total_earned: 2340, avg_rating: 4.8 },
  { driver_id: 'd2', full_name: 'Ana Rodríguez', phone: '0999999994', is_suspended: false, is_online: false, approved: true, rating: 4.5, vehicle_type: 'bicicleta', vehicle_plate: '', driver_since: new Date().toISOString(), total_deliveries: 89, total_earned: 1157, avg_rating: 4.5 },
];

export async function deleteUser(userId: string) {
  if (!isSupabaseReady) { mockUsers.splice(mockUsers.findIndex(u => u.id === userId), 1); return { ok: true }; }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
  return data as { ok: boolean };
}

// ── Users ──
export async function searchUsers(search = '', role?: string, limit = 50, offset = 0): Promise<AdminUser[]> {
  if (!isSupabaseReady) return mockUsers.filter(u => (role ? u.role === role : true) && (search ? u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) : true));
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_search_users', { p_search: search, p_role: role ?? null, p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function toggleSuspend(userId: string, suspended: boolean) {
  if (!isSupabaseReady) { const u = mockUsers.find(u => u.id === userId); if (u) u.is_suspended = suspended; return { ok: true }; }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_toggle_suspend', { p_user_id: userId, p_suspended: suspended });
  if (error) throw error;
  return data as { ok: boolean };
}

// ── Stores ──
export async function getAllStores(): Promise<AdminStore[]> {
  if (!isSupabaseReady) return mockStores;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('admin_store_stats').select('*').order('store_name');
  if (error) throw error;
  return (data ?? []) as AdminStore[];
}

export async function getStoreDetail(storeId: string): Promise<StoreDetail | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_store_detail', { p_store_id: storeId });
  if (error) throw error;
  return data as StoreDetail | null;
}

export async function toggleStoreStatus(storeId: string, isOpen: boolean) {
  if (!isSupabaseReady) { const s = mockStores.find(s => s.store_id === storeId); if (s) s.is_open = isOpen; return { ok: true }; }
  const supabase = getSupabase();
  const { error } = await supabase.from('stores').update({ is_open: isOpen }).eq('id', storeId);
  if (error) throw error;
  return { ok: true };
}

// ── Drivers ──
export async function getAllDrivers(): Promise<AdminDriver[]> {
  if (!isSupabaseReady) return mockDrivers;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('admin_driver_stats').select('*').order('full_name');
  if (error) throw error;
  return (data ?? []) as AdminDriver[];
}

export async function getDriverDetail(driverId: string): Promise<DriverDetail | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_driver_detail', { p_driver_id: driverId });
  if (error) throw error;
  return data as DriverDetail | null;
}

// ── Activity ──
export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  if (!isSupabaseReady) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_recent_activity', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as ActivityItem[];
}
