import { isSupabaseReady, getSupabase } from '../../../integrations/supabase/client';
import { getMockPromotionsByType } from '../../../shared/lib/mockData';
import type { Promotion } from '../../../shared/types';

export type PromoType = 'all' | 'restaurant' | 'super' | 'shipping' | 'coupon';

export type CouponValidation = {
  valid: boolean;
  discount: number;
  message: string;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  promotionId?: string;
};

type PromotionRecord = Partial<Promotion> & {
  stores?: { name?: string | null; emoji?: string | null } | null;
};

type RedemptionCountQuery = {
  count: number | null;
  error: Error | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPromoType(value: unknown): Promotion['type'] {
  return value === 'restaurant' || value === 'super' || value === 'shipping' || value === 'coupon'
    ? value
    : 'coupon';
}

function formatDiscount(type: 'percentage' | 'fixed', value: number) {
  return type === 'fixed' ? `$${value.toFixed(2)}` : `${value}% OFF`;
}

function normalizePromotion(row: PromotionRecord): Promotion {
  const discountValue = toNumber(row.discount_value, toNumber(row.discount));
  const discountType = row.discount_type === 'fixed' ? 'fixed' : 'percentage';

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? row.code ?? 'Promocion'),
    description: row.description ?? null,
    type: toPromoType(row.type),
    discount: row.discount ?? formatDiscount(discountType, discountValue),
    code: row.code ?? null,
    store_id: row.store_id ?? null,
    store_name: row.store_name ?? row.stores?.name ?? null,
    store_emoji: row.store_emoji ?? row.stores?.emoji ?? null,
    bg_color: row.bg_color ?? '#6D28D9',
    text_color: row.text_color ?? '#FFFFFF',
    emoji: row.emoji ?? '🎟️',
    expires_at: row.expires_at ?? row.ends_at ?? '',
    is_active: row.is_active ?? row.active ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
    discount_type: discountType,
    discount_value: discountValue,
    min_order: row.min_order ?? 0,
    max_uses: row.max_uses ?? undefined,
    uses_count: row.uses_count ?? 0,
    max_uses_per_customer: row.max_uses_per_customer ?? 1,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? row.expires_at ?? null,
    active: row.active ?? row.is_active ?? true,
  };
}

function isPromotionActive(row: PromotionRecord, now = new Date()) {
  const promotion = normalizePromotion(row);
  if (!promotion.is_active || promotion.active === false) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return false;
  if (promotion.expires_at && new Date(promotion.expires_at) < now) return false;
  if (
    promotion.max_uses != null
    && promotion.uses_count != null
    && promotion.uses_count >= promotion.max_uses
  ) {
    return false;
  }
  return true;
}

export async function getPromotions(type: PromoType = 'all'): Promise<Promotion[]> {
  if (!isSupabaseReady) return getMockPromotionsByType(type) as Promotion[];

  const supabase = getSupabase();
  let query = supabase
    .from('promotions')
    .select('*, stores(name, emoji)')
    .order('created_at', { ascending: false });

  if (type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as PromotionRecord[])
    .map(normalizePromotion)
    .filter((promotion) => isPromotionActive(promotion));
}

export async function applyCoupon(
  code: string,
  subtotal = 0,
  _userId?: string,
  storeId?: string,
): Promise<CouponValidation> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, discount: 0, message: 'Ingresa un codigo de descuento' };
  }

  if (!isSupabaseReady) {
    const validCodes: Record<string, { value: number; type: 'percentage' | 'fixed' }> = {
      RAYO20: { value: 20, type: 'percentage' },
      RAYO15: { value: 15, type: 'percentage' },
      SUPER15: { value: 15, type: 'percentage' },
      RAYO5: { value: 5, type: 'fixed' },
      COFFEE30: { value: 30, type: 'percentage' },
    };
    const promo = validCodes[normalizedCode];
    if (!promo) return { valid: false, discount: 0, message: 'Codigo invalido o expirado' };

    const rawDiscount = promo.type === 'fixed' ? promo.value : (subtotal > 0 ? (subtotal * promo.value) / 100 : promo.value);
    const discount = Math.min(rawDiscount, subtotal || rawDiscount);

    return {
      valid: true,
      discount,
      message: `Cupon aplicado: ${formatDiscount(promo.type, promo.value)}`,
      code: normalizedCode,
      discountType: promo.type,
    };
  }

  const { data, error } = await getSupabase()
    .from('promotions')
    .select('*, stores(name, emoji)')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, discount: 0, message: 'Codigo invalido o expirado' };
  }

  const promotion = normalizePromotion(data as PromotionRecord);
  if (!isPromotionActive(promotion)) {
    return { valid: false, discount: 0, message: 'Codigo expirado o sin usos disponibles' };
  }
  if (promotion.store_id && storeId && promotion.store_id !== storeId) {
    return { valid: false, discount: 0, message: 'Este cupon pertenece a otra tienda' };
  }
  if (promotion.min_order && subtotal < promotion.min_order) {
    return { valid: false, discount: 0, message: `Compra minima: $${promotion.min_order.toFixed(2)}` };
  }
  if (_userId && promotion.id && (promotion.max_uses_per_customer ?? 1) > 0) {
    const { count, error: redemptionError } = await getSupabase()
      .from('promotion_redemptions' as never)
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promotion.id)
      .eq('user_id', _userId) as unknown as RedemptionCountQuery;

    if (!redemptionError && (count ?? 0) >= (promotion.max_uses_per_customer ?? 1)) {
      return {
        valid: false,
        discount: 0,
        message: 'Ya usaste este cupon el maximo permitido',
      };
    }
  }

  const discountValue = toNumber(promotion.discount_value, toNumber(promotion.discount));
  const discountType = promotion.discount_type === 'fixed' ? 'fixed' : 'percentage';
  const rawDiscount = discountType === 'fixed' ? discountValue : (subtotal > 0 ? (subtotal * discountValue) / 100 : discountValue);
  const discount = Math.min(rawDiscount, subtotal || rawDiscount);

  return {
    valid: true,
    discount,
    message: `Cupon aplicado: ${promotion.discount}`,
    code: normalizedCode,
    discountType,
    promotionId: promotion.id,
  };
}
