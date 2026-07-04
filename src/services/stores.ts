import { getSupabase } from './supabase';
import type { Database } from '../types';

type Store = Database['public']['Tables']['stores']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export async function getStores(): Promise<Store[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProductsByStore(storeId: string): Promise<Product[]> {
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
