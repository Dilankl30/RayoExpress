import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface StoreInfo {
  name: string;
  description: string | null;
  emoji: string;
  cover_color: string;
  is_open: boolean;
  min_order: number;
  delivery_fee: number;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
}

export interface StoreSchedule {
  week_day: number;
  opens_at: string;
  closes_at: string;
}

export interface InventoryItem {
  id?: string;
  product_id: string;
  quantity: number;
  low_stock_threshold: number;
  product_name?: string;
  product_emoji?: string;
}

const defaultSchedule: StoreSchedule[] = [
  { week_day: 0, opens_at: '10:00', closes_at: '22:00' },
  { week_day: 1, opens_at: '10:00', closes_at: '22:00' },
  { week_day: 2, opens_at: '10:00', closes_at: '22:00' },
  { week_day: 3, opens_at: '10:00', closes_at: '22:00' },
  { week_day: 4, opens_at: '10:00', closes_at: '22:00' },
  { week_day: 5, opens_at: '10:00', closes_at: '23:00' },
  { week_day: 6, opens_at: '10:00', closes_at: '23:00' },
];

let mockSchedule = [...defaultSchedule];
const mockInventory: InventoryItem[] = [];

export async function getStoreInfo(storeId: string): Promise<StoreInfo | null> {
  if (!isSupabaseReady) {
    return { name: 'Burger King', description: 'Las mejores whoppers', emoji: '👑', cover_color: '#FF6B35', is_open: true, min_order: 5, delivery_fee: 0 };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
  if (error) throw error;
  return data;
}

export async function updateStoreInfo(storeId: string, updates: Partial<StoreInfo>) {
  if (!isSupabaseReady) return { id: storeId, ...updates };
  const supabase = getSupabase();
  const { error } = await supabase.from('stores').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', storeId);
  if (error) throw error;
}

export async function toggleStoreOpen(storeId: string, isOpen: boolean) {
  if (!isSupabaseReady) return { id: storeId, is_open: isOpen };
  return updateStoreInfo(storeId, { is_open: isOpen });
}

export async function getStoreSchedule(storeId: string): Promise<StoreSchedule[]> {
  if (!isSupabaseReady) return mockSchedule;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('store_schedules').select('*').eq('store_id', storeId).order('week_day');
  if (error) throw error;
  return data?.length ? data : defaultSchedule;
}

export async function saveStoreSchedule(storeId: string, schedules: StoreSchedule[]) {
  if (!isSupabaseReady) { mockSchedule = schedules; return; }
  const supabase = getSupabase();
  await supabase.from('store_schedules').delete().eq('store_id', storeId);
  if (schedules.length > 0) {
    const { error } = await supabase.from('store_schedules').insert(schedules.map((s) => ({ ...s, store_id: storeId })));
    if (error) throw error;
  }
}

export async function getInventory(storeId: string): Promise<InventoryItem[]> {
  if (!isSupabaseReady) return mockInventory;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('inventory')
    .select('*, products(name, emoji)')
    .eq('products.store_id', storeId);
  if (error) throw error;
  return (data ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    product_id: i.product_id as string,
    quantity: i.quantity as number,
    low_stock_threshold: i.low_stock_threshold as number,
    product_name: ((i.products as Record<string, unknown>)?.name as string) ?? '',
    product_emoji: ((i.products as Record<string, unknown>)?.emoji as string) ?? '',
  }));
}

export async function updateInventory(inventoryId: string, quantity: number) {
  if (!isSupabaseReady) {
    const item = mockInventory.find((i) => i.id === inventoryId);
    if (item) item.quantity = quantity;
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('inventory').update({ quantity, updated_at: new Date().toISOString() }).eq('id', inventoryId);
  if (error) throw error;
}
