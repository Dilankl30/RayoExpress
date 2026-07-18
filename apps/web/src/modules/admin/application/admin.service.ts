import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { getMockAddresses, getMockOrders } from '../../../shared/lib/mockData';

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_suspended: boolean;
  created_at: string;
  last_sign_in: string | null;
}

export interface AdminStore {
  store_id: string;
  store_name: string;
  is_open: boolean;
  emoji: string;
  min_order: number;
  delivery_fee: number;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  created_at: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  product_count: number;
}

export interface AdminDriver {
  driver_id: string;
  full_name: string | null;
  phone: string | null;
  is_suspended: boolean;
  is_online: boolean;
  approved: boolean;
  rating: number;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  driver_since: string;
  total_deliveries: number;
  total_earned: number;
  avg_rating: number;
}

export interface DriverDetail {
  driver: Record<string, unknown>;
  profile: Record<string, unknown>;
  recent_orders: Record<string, unknown>[];
  stats: { total_deliveries: number; total_earned: number; avg_rating: number };
}

export interface StoreDetail {
  store: Record<string, unknown>;
  owner: Record<string, unknown>;
  products: Record<string, unknown>[];
  recent_orders: Record<string, unknown>[];
  stats: { total_orders: number; total_revenue: number; avg_order_value: number };
}

export interface ActivityItem {
  id: string;
  action: string;
  type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user_name: string | null;
}

export interface UserDetailAddress {
  id: string;
  title: string;
  line1: string;
  details: string;
  is_default: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
}

export interface UserDetailOrder {
  id: string;
  status: string;
  total: number;
  delivery_address: string;
  created_at: string;
  updated_at: string | null;
  store_name: string | null;
  store_emoji: string | null;
  items_count: number;
}

export interface UserDetail {
  profile: AdminUser & { avatar_url: string | null };
  addresses: UserDetailAddress[];
  recent_orders: UserDetailOrder[];
  stats: {
    total_orders: number;
    total_spent: number;
    default_addresses: number;
    last_order_at: string | null;
  };
}

const now = () => new Date().toISOString();

const mockUsers: AdminUser[] = [
  { id: 'u1', full_name: 'Carlos Perez', email: 'carlos@mail.com', phone: '0999999991', role: 'customer', is_suspended: false, created_at: now(), last_sign_in: null },
  { id: 'u2', full_name: 'Maria Garcia', email: 'maria@mail.com', phone: '0999999992', role: 'customer', is_suspended: false, created_at: now(), last_sign_in: null },
  { id: 'u3', full_name: 'Luis Martinez', email: 'luis@mail.com', phone: '0999999993', role: 'driver', is_suspended: false, created_at: now(), last_sign_in: null },
  { id: 'u4', full_name: 'Ana Rodriguez', email: 'ana@mail.com', phone: '0999999994', role: 'driver', is_suspended: false, created_at: now(), last_sign_in: null },
  { id: 'u5', full_name: 'Pizzeria Napoli', email: 'napoli@mail.com', phone: '0999999995', role: 'store', is_suspended: false, created_at: now(), last_sign_in: null },
];

const mockStores: AdminStore[] = [
  {
    store_id: 's1',
    store_name: 'Pizzeria Napoli',
    is_open: true,
    emoji: '🍕',
    min_order: 5,
    delivery_fee: 1.5,
    owner_name: 'Carlos Perez',
    owner_phone: '0999999991',
    owner_email: 'carlos@mail.com',
    created_at: now(),
    total_orders: 342,
    total_revenue: 12840,
    avg_order_value: 37.54,
    product_count: 15,
  },
  {
    store_id: 's2',
    store_name: 'Sushi House',
    is_open: false,
    emoji: '🍣',
    min_order: 10,
    delivery_fee: 2,
    owner_name: 'Maria Garcia',
    owner_phone: '0999999992',
    owner_email: 'maria@mail.com',
    created_at: now(),
    total_orders: 189,
    total_revenue: 9450,
    avg_order_value: 50,
    product_count: 22,
  },
];

const mockDrivers: AdminDriver[] = [
  {
    driver_id: 'd1',
    full_name: 'Luis Martinez',
    phone: '0999999993',
    is_suspended: false,
    is_online: true,
    approved: true,
    rating: 4.8,
    vehicle_type: 'moto',
    vehicle_plate: 'ABC-123',
    driver_since: now(),
    total_deliveries: 156,
    total_earned: 2340,
    avg_rating: 4.8,
  },
  {
    driver_id: 'd2',
    full_name: 'Ana Rodriguez',
    phone: '0999999994',
    is_suspended: false,
    is_online: false,
    approved: true,
    rating: 4.5,
    vehicle_type: 'bicicleta',
    vehicle_plate: null,
    driver_since: now(),
    total_deliveries: 89,
    total_earned: 1157,
    avg_rating: 4.5,
  },
];

function normalizeJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') return Object.values(value) as T[];
  return [];
}

function removeFromMockUsers(userId: string) {
  const index = mockUsers.findIndex((user) => user.id === userId);
  if (index >= 0) mockUsers.splice(index, 1);
}

function normalizeDate(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function buildMockUserDetail(userId: string): UserDetail | null {
  const profile = mockUsers.find((user) => user.id === userId);
  if (!profile) return null;

  const mockAddressList = getMockAddresses(userId).map((address) => ({
    id: address.id,
    title: address.title,
    line1: address.line1,
    details: address.details,
    is_default: address.is_default,
    lat: typeof address.lat === 'number' ? address.lat : null,
    lng: typeof address.lng === 'number' ? address.lng : null,
    created_at: null,
  }));

  const mockOrderList = getMockOrders(userId).map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    delivery_address: order.delivery_address,
    created_at: order.created_at,
    updated_at: order.updated_at,
    store_name: order.store?.name ?? null,
    store_emoji: order.store?.emoji ?? null,
    items_count: order.order_items.length,
  }));

  const totalSpent = mockOrderList.reduce((sum, order) => sum + order.total, 0);

  return {
    profile: {
      ...profile,
      avatar_url: null,
    },
    addresses: mockAddressList,
    recent_orders: mockOrderList,
    stats: {
      total_orders: mockOrderList.length,
      total_spent: totalSpent,
      default_addresses: mockAddressList.filter((address) => address.is_default).length,
      last_order_at: mockOrderList[0]?.created_at ?? null,
    },
  };
}

export async function deleteUser(userId: string) {
  if (!isSupabaseReady) {
    removeFromMockUsers(userId);
    return { ok: true };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
  return data as { ok: boolean };
}

// Users
export async function searchUsers(search = '', role?: string, limit = 50, offset = 0): Promise<AdminUser[]> {
  if (!isSupabaseReady) {
    const searchTerm = search.trim().toLowerCase();
    return mockUsers.filter((user) => {
      const matchesRole = role ? user.role === role : true;
      const matchesSearch = !searchTerm
        || user.full_name?.toLowerCase().includes(searchTerm)
        || user.email?.toLowerCase().includes(searchTerm);
      return matchesRole && matchesSearch;
    }).slice(offset, offset + limit);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_search_users', {
    p_search: search,
    p_role: role ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (!error && Array.isArray(data)) return data as AdminUser[];

  const query = supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_suspended, created_at, last_sign_in')
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query.ilike('full_name', `%${search}%`);
  }

  if (role) {
    query.eq('role', role);
  }

  const { data: fallbackData, error: fallbackError } = await query.range(offset, offset + limit - 1);
  if (fallbackError) throw (error ?? fallbackError);
  return (fallbackData ?? []) as AdminUser[];
}

export async function toggleSuspend(userId: string, suspended: boolean) {
  if (!isSupabaseReady) {
    const user = mockUsers.find((item) => item.id === userId);
    if (user) user.is_suspended = suspended;
    return { ok: true };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_toggle_suspend', { p_user_id: userId, p_suspended: suspended });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  if (!isSupabaseReady) {
    return buildMockUserDetail(userId);
  }

  const supabase = getSupabase();
  const [addressesRes, ordersRes, detailRes] = await Promise.all([
    supabase
      .from('addresses')
      .select('id, title, line1, details, is_default, lat, lng, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, status, total, delivery_address, created_at, updated_at, store:stores(name, emoji), order_items(id)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('admin_get_user_detail', { p_user_id: userId }),
  ]);

  if (detailRes.error) {
    const profileRes = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, avatar_url, is_suspended, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) return null;

    const profile = {
      ...(profileRes.data as AdminUser & { avatar_url: string | null }),
      email: null,
    };
    const addresses = ((addressesRes.data ?? []) as Array<Record<string, unknown>>).map((address) => ({
      id: String(address.id),
      title: String(address.title ?? 'Dirección'),
      line1: String(address.line1 ?? ''),
      details: String(address.details ?? ''),
      is_default: Boolean(address.is_default),
      lat: typeof address.lat === 'number' && Number.isFinite(address.lat) ? address.lat : null,
      lng: typeof address.lng === 'number' && Number.isFinite(address.lng) ? address.lng : null,
      created_at: normalizeDate(address.created_at),
    })) as UserDetailAddress[];

    const recentOrders = ((ordersRes.data ?? []) as Array<Record<string, unknown>>).map((order) => {
      const store = order.store && typeof order.store === 'object'
        ? order.store as { name?: string | null; emoji?: string | null }
        : null;
      const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

      return {
        id: String(order.id),
        status: String(order.status ?? 'pending'),
        total: toNumber(order.total),
        delivery_address: String(order.delivery_address ?? ''),
        created_at: String(order.created_at ?? new Date().toISOString()),
        updated_at: normalizeDate(order.updated_at),
        store_name: store?.name ?? null,
        store_emoji: store?.emoji ?? null,
        items_count: orderItems.length,
      } satisfies UserDetailOrder;
    });

    return {
      profile,
      addresses,
      recent_orders: recentOrders,
      stats: {
        total_orders: recentOrders.length,
        total_spent: recentOrders.reduce((sum: number, order: UserDetailOrder) => sum + order.total, 0),
        default_addresses: addresses.filter((address) => address.is_default).length,
        last_order_at: recentOrders[0]?.created_at ?? null,
      },
    };
  }

  if (!detailRes.data) return null;

  const detail = detailRes.data as {
    profile?: AdminUser & { avatar_url: string | null };
    email?: string | null;
    addresses?: unknown[];
    recent_orders?: unknown[];
    stats?: Partial<UserDetail['stats']>;
  };

  const profile = detail.profile
    ? {
        ...detail.profile,
        email: detail.email ?? detail.profile.email ?? null,
      }
    : null;
  if (!profile) return null;

  const addresses = ((addressesRes.data ?? []) as Array<Record<string, unknown>>).map((address) => ({
    id: String(address.id),
    title: String(address.title ?? 'Dirección'),
    line1: String(address.line1 ?? ''),
    details: String(address.details ?? ''),
    is_default: Boolean(address.is_default),
    lat: typeof address.lat === 'number' && Number.isFinite(address.lat) ? address.lat : null,
    lng: typeof address.lng === 'number' && Number.isFinite(address.lng) ? address.lng : null,
    created_at: normalizeDate(address.created_at),
  })) as UserDetailAddress[];

  const recentOrders = ((ordersRes.data ?? []) as Array<Record<string, unknown>>).map((order) => {
    const store = order.store && typeof order.store === 'object'
      ? order.store as { name?: string | null; emoji?: string | null }
      : null;
    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

    return {
      id: String(order.id),
      status: String(order.status ?? 'pending'),
      total: toNumber(order.total),
      delivery_address: String(order.delivery_address ?? ''),
      created_at: String(order.created_at ?? new Date().toISOString()),
      updated_at: normalizeDate(order.updated_at),
      store_name: store?.name ?? null,
      store_emoji: store?.emoji ?? null,
      items_count: orderItems.length,
    } satisfies UserDetailOrder;
  });

  return {
    profile,
    addresses,
    recent_orders: recentOrders,
    stats: {
      total_orders: detail.stats?.total_orders ?? recentOrders.length,
      total_spent: detail.stats?.total_spent ?? recentOrders.reduce((sum: number, order: UserDetailOrder) => sum + order.total, 0),
      default_addresses: detail.stats?.default_addresses ?? addresses.filter((address) => address.is_default).length,
      last_order_at: detail.stats?.last_order_at ?? recentOrders[0]?.created_at ?? null,
    },
  };
}

// Stores
export async function getAllStores(): Promise<AdminStore[]> {
  if (!isSupabaseReady) return mockStores;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_admin_store_stats');
  if (error) throw error;
  return normalizeJsonArray<AdminStore>(data);
}

export async function getStoreDetail(storeId: string): Promise<StoreDetail | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_store_detail', { p_store_id: storeId });
  if (error) throw error;
  return data as StoreDetail | null;
}

export async function toggleStoreStatus(storeId: string, isOpen: boolean) {
  if (!isSupabaseReady) {
    const store = mockStores.find((item) => item.store_id === storeId);
    if (store) store.is_open = isOpen;
    return { ok: true };
  }

  const supabase = getSupabase();
  const { error } = await supabase.from('stores').update({ is_open: isOpen }).eq('id', storeId);
  if (error) throw error;
  return { ok: true };
}

// Drivers
export async function getAllDrivers(): Promise<AdminDriver[]> {
  if (!isSupabaseReady) return mockDrivers;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_admin_driver_stats');
  if (error) throw error;
  return normalizeJsonArray<AdminDriver>(data);
}

export async function getDriverDetail(driverId: string): Promise<DriverDetail | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_driver_detail', { p_driver_id: driverId });
  if (error) throw error;
  return data as DriverDetail | null;
}

// Activity
export async function getRecentActivity(limit = 50): Promise<ActivityItem[]> {
  if (!isSupabaseReady) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_recent_activity', { p_limit: limit });
  if (error) throw error;
  if (!data) return [];

  const items = Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []);
  return items
    .map((item): ActivityItem | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const action = typeof record.action === 'string' ? record.action : null;
      const type = typeof record.entity_type === 'string' ? record.entity_type : null;
      const createdAt = typeof record.created_at === 'string' ? record.created_at : null;
      if (!id || !action || !type || !createdAt) return null;

      return {
        id,
        action,
        type,
        details: record.details && typeof record.details === 'object' ? record.details as Record<string, unknown> : null,
        created_at: createdAt,
        user_name: typeof record.user_name === 'string' ? record.user_name : null,
      };
    })
    .filter((item): item is ActivityItem => item !== null);
}

