import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface StoreDashboardStats {
  salesToday: number;
  activeOrders: number;
  productCount: number;
  rating: number;
}

export interface OrderSummary {
  id: string;
  status: string;
  total: number;
  customer_name: string | null;
  created_at: string;
}

export async function getStoreByOwner(ownerId: string): Promise<{ id: string; name: string; is_open: boolean; photo_url?: string | null; latitude?: number | null; longitude?: number | null; city?: string | null; address?: string | null; phone?: string | null; description?: string | null; emoji?: string; min_order?: number; delivery_fee?: number } | null> {
  if (!isSupabaseReady) {
    return { id: 'store-1', name: 'Burger King', is_open: true, city: 'El Coca', latitude: -2.1706, longitude: -79.9223 };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStoreDashboardStats(storeId: string): Promise<StoreDashboardStats> {
  if (!isSupabaseReady) {
    return { salesToday: 347.2, activeOrders: 3, productCount: 24, rating: 4.8 };
  }
  const supabase = getSupabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [salesRes, activeRes, productsRes, ratingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .eq('store_id', storeId)
      .eq('status', 'delivered')
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .in('status', ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived']),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('is_active', true),
    supabase
      .from('stores')
      .select('rating')
      .eq('id', storeId),
  ]);

  if (salesRes.error) throw salesRes.error;
  const salesToday = (salesRes.data as { total: number }[] || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrders = activeRes.count ?? 0;
  const productCount = productsRes.count ?? 0;
  const ratings = (ratingRes.data as { rating: number }[] || []).map((d) => d.rating).filter(Boolean);
  const rating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return { salesToday, activeOrders, productCount, rating };
}

export async function getStoreRecentOrders(storeId: string): Promise<OrderSummary[]> {
  if (!isSupabaseReady) {
    return [
      { id: 'order-1', status: 'delivered', total: 12.5, customer_name: 'Juan Pérez', created_at: new Date().toISOString() },
      { id: 'order-2', status: 'preparing', total: 28.0, customer_name: 'Ana García', created_at: new Date().toISOString() },
    ];
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, created_at, customer:profiles!customer_id(full_name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []).map((o: Record<string, unknown>) => ({
    id: o.id as string,
    status: o.status as string,
    total: o.total as number,
    customer_name: ((o.customer as Record<string, unknown>)?.full_name as string) ?? null,
    created_at: o.created_at as string,
  }));
}
