import { getSupabase, isSupabaseReady } from './supabase';
import {
  mockStores, mockCategories, getMockProductsByStore, getMockProductsByCategory,
} from './mockData';
import type { Database } from '../app/types';

type Store = Database['public']['Tables']['stores']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export async function getStores(): Promise<Store[]> {
  if (!isSupabaseReady) return mockStores as Store[];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*').order('name');
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
