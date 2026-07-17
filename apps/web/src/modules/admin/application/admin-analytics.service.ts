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

export interface AdminDashboardSummary {
  kpis: AdminKPIs;
  monthly_sales: MonthlySales[];
  daily_orders: DailyOrders[];
  category_distribution: CategoryDistribution[];
  recent_orders: RecentOrder[];
  user_counts: UserCounts;
  recent_users: RecentUser[];
}

const MOCK_COLORS = ['#6D28D9', '#FFD400', '#3B82F6', '#E5E7EB'];

function buildMockSummary(): AdminDashboardSummary {
  return {
    kpis: {
      salesToday: 3847,
      activeOrders: 38,
      activeCustomers: 1284,
      activeStores: 47,
      onlineDrivers: 23,
      platformRevenue: 384,
    },
    monthly_sales: [
      { month: 'Ene', sales: 12400, orders: 420 },
      { month: 'Feb', sales: 14200, orders: 512 },
      { month: 'Mar', sales: 13800, orders: 489 },
      { month: 'Abr', sales: 16900, orders: 631 },
      { month: 'May', sales: 18200, orders: 720 },
      { month: 'Jun', sales: 19800, orders: 798 },
      { month: 'Jul', sales: 21500, orders: 865 },
    ],
    daily_orders: [
      { day: 'L', orders: 89 },
      { day: 'M', orders: 112 },
      { day: 'X', orders: 98 },
      { day: 'J', orders: 127 },
      { day: 'V', orders: 145 },
      { day: 'S', orders: 162 },
      { day: 'D', orders: 74 },
    ],
    category_distribution: [
      { name: 'Restaurantes', value: 45, color: '#6D28D9' },
      { name: 'Super', value: 25, color: '#FFD400' },
      { name: 'Farmacias', value: 15, color: '#3B82F6' },
      { name: 'Otros', value: 15, color: '#E5E7EB' },
    ],
    recent_orders: [
      { id: 'ORD-2849', client: 'Juan Pérez', store: 'Burger King', amount: 12.5, status: 'delivered', created_at: new Date().toISOString() },
      { id: 'ORD-2848', client: 'Ana García', store: 'KFC', amount: 28, status: 'on_the_way', created_at: new Date().toISOString() },
      { id: 'ORD-2847', client: 'Luis Mora', store: 'Subway', amount: 15.99, status: 'preparing', created_at: new Date().toISOString() },
    ],
    user_counts: { customers: 8247, stores: 234, drivers: 89, admins: 5 },
    recent_users: [
      { id: '1', full_name: 'María García', role: 'customer', is_suspended: false, created_at: new Date().toISOString() },
      { id: '2', full_name: 'Carlos Andrade', role: 'driver', is_suspended: false, created_at: new Date().toISOString() },
      { id: '3', full_name: 'Burger King Q', role: 'store', is_suspended: false, created_at: new Date().toISOString() },
    ],
  };
}

function toArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function normalizeDashboardSummary(value: unknown): AdminDashboardSummary | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;

  if (!payload.kpis || !payload.user_counts) return null;

  const rawCategoryDistribution = toArray<Record<string, unknown>>(payload.category_distribution);
  const category_distribution = rawCategoryDistribution.map((item, index) => ({
    name: typeof item.name === 'string' ? item.name : 'Otros',
    value: typeof item.value === 'number' ? item.value : Number(item.value ?? 0),
    color: MOCK_COLORS[index % MOCK_COLORS.length],
  }));

  return {
    kpis: payload.kpis as AdminKPIs,
    monthly_sales: toArray<MonthlySales>(payload.monthly_sales),
    daily_orders: toArray<DailyOrders>(payload.daily_orders),
    category_distribution,
    recent_orders: toArray<RecentOrder>(payload.recent_orders),
    user_counts: payload.user_counts as UserCounts,
    recent_users: toArray<RecentUser>(payload.recent_users),
  };
}

export async function getAdminDashboardSummary(period = '7d'): Promise<AdminDashboardSummary> {
  if (!isSupabaseReady) {
    return buildMockSummary();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_dashboard_summary', { p_period: period });
  if (error) throw error;

  const summary = normalizeDashboardSummary(data);
  if (!summary) {
    throw new Error('No se pudo leer el resumen del panel admin.');
  }

  return summary;
}

export async function getAdminKPIs(period = '7d'): Promise<AdminKPIs> {
  return (await getAdminDashboardSummary(period)).kpis;
}

export async function getMonthlySales(period = '7d'): Promise<MonthlySales[]> {
  return (await getAdminDashboardSummary(period)).monthly_sales;
}

export async function getDailyOrders(period = '7d'): Promise<DailyOrders[]> {
  return (await getAdminDashboardSummary(period)).daily_orders;
}

export async function getCategoryDistribution(period = '7d'): Promise<CategoryDistribution[]> {
  return (await getAdminDashboardSummary(period)).category_distribution;
}

export async function getRecentOrders(period = '7d'): Promise<RecentOrder[]> {
  return (await getAdminDashboardSummary(period)).recent_orders;
}

export async function getUserCountsByRole(period = '7d'): Promise<UserCounts> {
  return (await getAdminDashboardSummary(period)).user_counts;
}

export async function getRecentUsers(period = '7d'): Promise<RecentUser[]> {
  return (await getAdminDashboardSummary(period)).recent_users;
}
