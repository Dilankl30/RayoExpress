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

export interface StorePromotionData {
  id?: string;
  store_id: string;
  title: string;
  description: string | null;
  code: string | null;
  type: 'restaurant' | 'super' | 'shipping' | 'coupon';
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_customer: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  is_active: boolean;
  bg_color: string;
  text_color: string;
  emoji: string;
}

const mockStoreProducts: Record<string, ProductData[]> = {};
const mockStorePromotions: Record<string, StorePromotionData[]> = {};

function formatPromotionDiscount(type: 'percentage' | 'fixed', value: number) {
  return type === 'fixed' ? `$${value.toFixed(2)}` : `${value}% OFF`;
}

function normalizePromotionPayload(
  storeId: string,
  promotionData: Omit<StorePromotionData, 'id' | 'store_id' | 'uses_count'>,
) {
  const discountValue = Number(promotionData.discount_value || 0);

  return {
    ...promotionData,
    store_id: storeId,
    code: promotionData.code ? promotionData.code.trim().toUpperCase() : null,
    description: promotionData.description || null,
    discount: formatPromotionDiscount(promotionData.discount_type, discountValue),
    uses_count: 0,
    active: promotionData.active,
    is_active: promotionData.active,
    expires_at: promotionData.ends_at,
  };
}

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

export async function createProduct(storeId: string, productData: Omit<ProductData, 'id' | 'store_id'>) {
  if (!isSupabaseReady) {
    const p: ProductData = { ...productData, id: `mock-prod-${Date.now()}`, store_id: storeId };
    if (!mockStoreProducts[storeId]) mockStoreProducts[storeId] = [];
    mockStoreProducts[storeId].push(p);
    return p;
  }
  const supabase = getSupabase();
  
  const { data: product, error } = await supabase.rpc('create_product_secure', {
    p_store_id: storeId,
    p_name: productData.name,
    p_price: productData.price,
    p_emoji: productData.emoji,
    p_description: productData.description,
    p_category_id: productData.category_id,
    p_image_url: productData.image_url,
  });

  if (error) throw error;
  return product as ProductData;
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
  const { data, error } = await supabase.rpc('create_category_secure', {
    p_name: category.name,
    p_emoji: category.emoji,
    p_bg_color: category.bg_color,
  });
  if (error) throw error;
  return data as CategoryData;
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

export async function getStorePromotions(storeId: string): Promise<StorePromotionData[]> {
  if (!isSupabaseReady) return mockStorePromotions[storeId] || [];

  const { data, error } = await getSupabase()
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StorePromotionData[];
}

export async function createStorePromotion(
  storeId: string,
  promotionData: Omit<StorePromotionData, 'id' | 'store_id' | 'uses_count'>,
) {
  if (!isSupabaseReady) {
    const promotion: StorePromotionData = {
      ...promotionData,
      id: `mock-promo-${Date.now()}`,
      store_id: storeId,
      uses_count: 0,
      code: promotionData.code ? promotionData.code.trim().toUpperCase() : null,
      is_active: promotionData.active,
    };
    if (!mockStorePromotions[storeId]) mockStorePromotions[storeId] = [];
    mockStorePromotions[storeId].unshift(promotion);
    return promotion;
  }

  const payload = normalizePromotionPayload(storeId, promotionData);
  const { data, error } = await getSupabase()
    .from('promotions')
    .insert(payload as never)
    .select()
    .single();

  if (error) throw error;
  return data as StorePromotionData;
}

export async function updateStorePromotion(
  promotionId: string,
  updates: Partial<Omit<StorePromotionData, 'id' | 'store_id'>>,
) {
  const payload: Record<string, unknown> = { ...updates };
  if (typeof payload.code === 'string') payload.code = payload.code.trim().toUpperCase();
  if (payload.active !== undefined) payload.is_active = payload.active;
  if (payload.ends_at !== undefined) payload.expires_at = payload.ends_at;
  if (payload.discount_type && payload.discount_value !== undefined) {
    payload.discount = formatPromotionDiscount(
      payload.discount_type as 'percentage' | 'fixed',
      Number(payload.discount_value),
    );
  }

  if (!isSupabaseReady) {
    for (const list of Object.values(mockStorePromotions)) {
      const idx = list.findIndex((promotion) => promotion.id === promotionId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload } as StorePromotionData;
        return list[idx];
      }
    }
    return null;
  }

  const { data, error } = await getSupabase()
    .from('promotions')
    .update(payload as never)
    .eq('id', promotionId)
    .select()
    .single();

  if (error) throw error;
  return data as StorePromotionData;
}

export async function deleteStorePromotion(promotionId: string) {
  if (!isSupabaseReady) {
    for (const list of Object.values(mockStorePromotions)) {
      const idx = list.findIndex((promotion) => promotion.id === promotionId);
      if (idx !== -1) {
        list.splice(idx, 1);
        return;
      }
    }
    return;
  }

  const { error } = await getSupabase().from('promotions').delete().eq('id', promotionId);
  if (error) throw error;
}
