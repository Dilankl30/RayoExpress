import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface AdminKPIs {
  salesToday: number;
  activeOrders: number;
  activeCustomers: number;
  activeStores: number;
  onlineDrivers: number;
  platformRevenue: number;
}

export interface MonthlySales {
  month: string;
  sales: number;
  orders: number;
}

export interface DailyOrders {
  day: string;
  orders: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

export interface RecentOrder {
  id: string;
  client: string;
  store: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface UserCounts {
  customers: number;
  stores: number;
  drivers: number;
  admins: number;
}

export interface RecentUser {
  id: string;
  full_name: string | null;
  role: string;
  is_suspended: boolean;
  created_at: string;
}

const MOCK_COLORS = ['#6D28D9', '#FFD400', '#3B82F6', '#E5E7EB'];

export async function getAdminKPIs(): Promise<AdminKPIs> {
  if (!isSupabaseReady) {
    return { salesToday: 3847, activeOrders: 38, activeCustomers: 1284, activeStores: 47, onlineDrivers: 23, platformRevenue: 384 };
  }
  const supabase = getSupabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [salesRes, activeRes, customerRes, storeRes, driverRes] = await Promise.all([
    supabase.from('orders').select('total').eq('status', 'delivered').gte('created_at', todayStart.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived']),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('is_online', true),
  ]);

  if (salesRes.error) throw salesRes.error;
  const salesToday = (salesRes.data as { total: number }[] || []).reduce((s, o) => s + (o.total || 0), 0);

  return {
    salesToday,
    activeOrders: activeRes.count ?? 0,
    activeCustomers: customerRes.count ?? 0,
    activeStores: storeRes.count ?? 0,
    onlineDrivers: driverRes.count ?? 0,
    platformRevenue: Math.round(salesToday * 0.1 * 100) / 100,
  };
}

export async function getMonthlySales(): Promise<MonthlySales[]> {
  if (!isSupabaseReady) {
    return [
      { month: 'Ene', sales: 12400, orders: 420 },
      { month: 'Feb', sales: 14200, orders: 512 },
      { month: 'Mar', sales: 13800, orders: 489 },
      { month: 'Abr', sales: 16900, orders: 631 },
      { month: 'May', sales: 18200, orders: 720 },
      { month: 'Jun', sales: 19800, orders: 798 },
      { month: 'Jul', sales: 21500, orders: 865 },
    ];
  }
  const supabase = getSupabase();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', sixMonthsAgo.toISOString());
  if (error) throw error;

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const buckets: Record<string, { sales: number; orders: number }> = {};

  for (const row of (data || []) as { total: number; created_at: string }[]) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!buckets[key]) buckets[key] = { sales: 0, orders: 0 };
    buckets[key].sales += row.total || 0;
    buckets[key].orders += 1;
  }

  return Object.entries(buckets).slice(-7).map(([key, val]) => {
    const monthIdx = parseInt(key.split('-')[1], 10);
    return { month: months[monthIdx] || key, sales: Math.round(val.sales * 100) / 100, orders: val.orders };
  });
}

export async function getDailyOrders(): Promise<DailyOrders[]> {
  if (!isSupabaseReady) {
    return [
      { day: 'L', orders: 89 }, { day: 'M', orders: 112 }, { day: 'X', orders: 98 },
      { day: 'J', orders: 127 }, { day: 'V', orders: 145 }, { day: 'S', orders: 162 }, { day: 'D', orders: 74 },
    ];
  }
  const supabase = getSupabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .gte('created_at', weekAgo.toISOString());
  if (error) throw error;

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const buckets: Record<string, number> = { D: 0, L: 0, M: 0, X: 0, J: 0, V: 0, S: 0 };

  for (const row of (data || []) as { created_at: string }[]) {
    const dayIdx = new Date(row.created_at).getDay();
    buckets[dayNames[dayIdx]] += 1;
  }

  return dayNames.map((day) => ({ day, orders: buckets[day] }));
}

export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  if (!isSupabaseReady) {
    return [
      { name: 'Restaurantes', value: 45, color: '#6D28D9' },
      { name: 'Súper', value: 25, color: '#FFD400' },
      { name: 'Farmacias', value: 15, color: '#3B82F6' },
      { name: 'Otros', value: 15, color: '#E5E7EB' },
    ];
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('store:stores!store_id(category:categories(name))');
  if (error) throw error;

  const buckets: Record<string, number> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const store = row.store as Record<string, unknown> | null;
    const category = store?.category as Record<string, unknown> | null;
    const name = (category?.name as string) || 'Otros';
    buckets[name] = (buckets[name] || 0) + 1;
  }

  const total = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(buckets).map(([name, value], i) => ({
    name,
    value: Math.round((value / total) * 100),
    color: MOCK_COLORS[i % MOCK_COLORS.length],
  }));
}

export async function getRecentOrders(): Promise<RecentOrder[]> {
  if (!isSupabaseReady) {
    return [
      { id: 'ORD-2849', client: 'Juan Pérez', store: 'Burger King', amount: 12.5, status: 'delivered', created_at: new Date().toISOString() },
      { id: 'ORD-2848', client: 'Ana García', store: 'KFC', amount: 28.0, status: 'on_the_way', created_at: new Date().toISOString() },
      { id: 'ORD-2847', client: 'Luis Mora', store: 'Subway', amount: 15.99, status: 'preparing', created_at: new Date().toISOString() },
    ];
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, created_at, customer:profiles!customer_id(full_name), store:stores(name)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []).map((o: Record<string, unknown>) => ({
    id: o.id as string,
    client: ((o.customer as Record<string, unknown>)?.full_name as string) ?? 'Desconocido',
    store: ((o.store as Record<string, unknown>)?.name as string) ?? '',
    amount: o.total as number,
    status: o.status as string,
    created_at: o.created_at as string,
  }));
}

export async function getUserCountsByRole(): Promise<UserCounts> {
  if (!isSupabaseReady) {
    return { customers: 8247, stores: 234, drivers: 89, admins: 5 };
  }
  const supabase = getSupabase();
  const [customerRes, storeRes, driverRes, adminRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'store'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
  ]);

  return {
    customers: customerRes.count ?? 0,
    stores: storeRes.count ?? 0,
    drivers: driverRes.count ?? 0,
    admins: adminRes.count ?? 0,
  };
}

export async function getRecentUsers(): Promise<RecentUser[]> {
  if (!isSupabaseReady) {
    return [
      { id: '1', full_name: 'María García', role: 'customer', is_suspended: false, created_at: new Date().toISOString() },
      { id: '2', full_name: 'Carlos Andrade', role: 'driver', is_suspended: false, created_at: new Date().toISOString() },
      { id: '3', full_name: 'Burger King Q', role: 'store', is_suspended: false, created_at: new Date().toISOString() },
    ];
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []) as RecentUser[];
}
