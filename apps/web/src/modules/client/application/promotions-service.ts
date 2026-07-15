import { isSupabaseReady, getSupabase } from '../../../integrations/supabase/client';
import { getMockPromotionsByType } from '../../../shared/lib/mockData';
import type { Database } from '../../../shared/types';

type Promotion = Database['public']['Tables']['promotions']['Row'];

export type PromoType = 'all' | 'restaurant' | 'super' | 'shipping' | 'coupon';

export async function getPromotions(type: PromoType = 'all'): Promise<Promotion[]> {
  if (!isSupabaseReady) return getMockPromotionsByType(type) as Promotion[];
  const supabase = getSupabase();
  let query = supabase.from('promotions').select('*, stores(name, emoji)').eq('is_active', true).order('created_at', { ascending: false });
  if (type !== 'all') {
    query = query.eq('type', type);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function applyCoupon(code: string): Promise<{ valid: boolean; discount: number; message: string }> {
  if (!isSupabaseReady) {
    const validCodes: Record<string, number> = { RAYO20: 20, RAYO15: 15, SUPER15: 15, RAYO5: 5, COFFEE30: 30 };
    const discount = validCodes[code.toUpperCase()];
    if (discount) return { valid: true, discount, message: `Cupón aplicado: ${discount}% OFF` };
    return { valid: false, discount: 0, message: 'Código inválido o expirado' };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('promotions').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
  if (error || !data) return { valid: false, discount: 0, message: 'Código inválido o expirado' };
  return { valid: true, discount: parseInt(data.discount) || 0, message: `Cupón aplicado: ${data.discount}` };
}
