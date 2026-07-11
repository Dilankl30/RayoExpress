import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import {
  mockStores, mockCategories, getMockProductsByStore, getMockProductsByCategory,
} from '../../../shared/lib/mockData';
import { logAuditEvent } from '../../audit/application/audit.service';
import type { Database } from '../../../shared/types';

type Store = Database['public']['Tables']['stores']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export async function getStoresInBounds(northEast: [number, number], southWest: [number, number]): Promise<Store[]> {
  if (!isSupabaseReady) {
    return (mockStores as Store[]).filter(s => 
      s.latitude && s.longitude && 
      s.latitude <= northEast[0] && s.latitude >= southWest[0] && 
      s.longitude <= northEast[1] && s.longitude >= southWest[1]
    );
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .lte('latitude', northEast[0])
    .gte('latitude', southWest[0])
    .lte('longitude', northEast[1])
    .gte('longitude', southWest[1])
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStores(city?: string): Promise<Store[]> {
  if (!isSupabaseReady) {
    let list = mockStores as Store[];
    if (city) list = list.filter((s) => (s as any).city === city);
    return list;
  }
  const supabase = getSupabase();
  let query = supabase.from('stores').select('*');
  if (city) query = query.eq('city', city);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStoresWithLocation(city?: string): Promise<Store[]> {
  if (!isSupabaseReady) {
    let list = mockStores as Store[];
    if (city) list = list.filter((s) => (s as any).city === city);
    return list.filter((s) => (s as any).latitude && (s as any).longitude);
  }
  const supabase = getSupabase();
  let query = supabase.from('stores').select('*').not('latitude', 'is', null).not('longitude', 'is', null);
  if (city) query = query.eq('city', city);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStoreById(id: string): Promise<Store | null> {
  if (!isSupabaseReady) return (mockStores as Store[]).find((s) => s.id === id) ?? null;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseReady) return mockCategories as Category[];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProductsByStore(storeId: string): Promise<Product[]> {
  if (!isSupabaseReady) return getMockProductsByStore(storeId) as Product[];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  if (!isSupabaseReady) return getMockProductsByCategory(categoryId) as Product[];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*, stores(name, emoji)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createStore(data: { name: string; description?: string; emoji?: string; city?: string; user_id: string; owner_id?: string }) {
  const ownerId = data.owner_id ?? data.user_id;
  if (!isSupabaseReady) {
    const store = { id: `mock-store-${Date.now()}`, ...data, owner_id: ownerId } as any;
    logAuditEvent({ userId: ownerId, action: 'STORE_CREATED', entityType: 'store', entityId: store.id, details: { name: data.name, city: data.city } }).catch(() => {});
    return store;
  }
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('stores')
    .insert({ name: data.name, description: data.description ?? null, emoji: data.emoji ?? 'RE', city: data.city ?? null, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  logAuditEvent({ userId: ownerId, action: 'STORE_CREATED', entityType: 'store', entityId: result.id, details: { name: data.name, city: data.city } }).catch(() => {});
  return result;
}

export async function updateStore(storeId: string, userId: string, updates: Partial<{ name: string; description: string; emoji: string; is_open: boolean; min_order: number; delivery_fee: number }>) {
  if (!isSupabaseReady) {
    logAuditEvent({ userId, action: 'STORE_UPDATED', entityType: 'store', entityId: storeId, details: updates }).catch(() => {});
    return { id: storeId, ...updates };
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('stores').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', storeId);
  if (error) throw error;
  logAuditEvent({ userId, action: 'STORE_UPDATED', entityType: 'store', entityId: storeId, details: updates }).catch(() => {});
}

export async function createProduct(storeId: string, userId: string, product: { name: string; price: number; description?: string; category_id?: string; emoji?: string; image_url?: string }) {
  if (!isSupabaseReady) {
    const p = { ...product, id: `mock-prod-${Date.now()}`, store_id: storeId, is_active: true };
    logAuditEvent({ userId, action: 'PRODUCT_CREATED', entityType: 'product', entityId: p.id, details: { storeId, name: product.name } }).catch(() => {});
    return p;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, store_id: storeId, is_active: true })
    .select()
    .single();
  if (error) throw error;
  logAuditEvent({ userId, action: 'PRODUCT_CREATED', entityType: 'product', entityId: data.id, details: { storeId, name: product.name } }).catch(() => {});
  return data;
}

export async function updateProduct(productId: string, userId: string, updates: Partial<{ name: string; price: number; description: string; category_id: string; emoji: string; image_url: string; is_active: boolean }>) {
  if (!isSupabaseReady) {
    logAuditEvent({ userId, action: 'PRODUCT_UPDATED', entityType: 'product', entityId: productId, details: updates }).catch(() => {});
    return { id: productId, ...updates };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('products').update(updates).eq('id', productId).select().single();
  if (error) throw error;
  logAuditEvent({ userId, action: 'PRODUCT_UPDATED', entityType: 'product', entityId: productId, details: updates }).catch(() => {});
  return data;
}

export async function deleteProduct(productId: string, userId: string) {
  if (!isSupabaseReady) {
    logAuditEvent({ userId, action: 'PRODUCT_DELETED', entityType: 'product', entityId: productId }).catch(() => {});
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
  logAuditEvent({ userId, action: 'PRODUCT_DELETED', entityType: 'product', entityId: productId }).catch(() => {});
}

export async function getProductsByStores(storeIds: string[]): Promise<Product[]> {
  if (storeIds.length === 0) return [];
  if (!isSupabaseReady) {
    const list: Product[] = [];
    for (const id of storeIds) {
      list.push(...(getMockProductsByStore(id) as Product[]));
    }
    return list;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('store_id', storeIds)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}
