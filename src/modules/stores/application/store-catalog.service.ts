import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { mockProducts, mockCategories } from '../../../shared/lib/mockData';

export interface ProductData {
  id?: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  emoji: string;
  image_url: string | null;
  is_active: boolean;
}

export interface CategoryData {
  id?: string;
  name: string;
  emoji: string;
  bg_color: string;
}

const mockStoreProducts: Record<string, ProductData[]> = {};

export async function getStoreProducts(storeId: string): Promise<ProductData[]> {
  if (!isSupabaseReady) return mockProducts[storeId] || mockStoreProducts[storeId] || [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(storeId: string, product: Omit<ProductData, 'id' | 'store_id'>) {
  if (!isSupabaseReady) {
    const p: ProductData = { ...product, id: `mock-prod-${Date.now()}`, store_id: storeId };
    if (!mockStoreProducts[storeId]) mockStoreProducts[storeId] = [];
    mockStoreProducts[storeId].push(p);
    return p;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, store_id: storeId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(productId: string, updates: Partial<Omit<ProductData, 'id' | 'store_id'>>) {
  if (!isSupabaseReady) {
    for (const list of Object.values(mockStoreProducts)) {
      const idx = list.findIndex((p) => p.id === productId);
      if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; return list[idx]; }
    }
    for (const list of Object.values(mockProducts)) {
      const idx = list.findIndex((p: ProductData) => p.id === productId);
      if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; return list[idx]; }
    }
    return null;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(productId: string) {
  if (!isSupabaseReady) {
    for (const list of Object.values(mockStoreProducts)) {
      const idx = list.findIndex((p) => p.id === productId);
      if (idx !== -1) { list.splice(idx, 1); return; }
    }
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

export async function getCategories(): Promise<CategoryData[]> {
  if (!isSupabaseReady) return mockCategories as CategoryData[];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(category: Omit<CategoryData, 'id'>) {
  if (!isSupabaseReady) {
    const cat: CategoryData = { ...category, id: `mock-cat-${Date.now()}` };
    (mockCategories as CategoryData[]).push(cat);
    return cat;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryId: string) {
  if (!isSupabaseReady) {
    const list = mockCategories as CategoryData[];
    const idx = list.findIndex((c) => c.id === categoryId);
    if (idx !== -1) list.splice(idx, 1);
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
}
