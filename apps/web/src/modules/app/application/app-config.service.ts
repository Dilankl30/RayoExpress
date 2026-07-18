import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

const DRIVER_HIRING_KEY = 'driver_hiring_enabled';
const CHECKOUT_PRICING_KEY = 'checkout_pricing';

type AppConfigRow = { value?: unknown };

export interface CheckoutPricing {
  deliveryFee: number;
  taxRate: number;
}

export const DEFAULT_CHECKOUT_PRICING: CheckoutPricing = {
  deliveryFee: 1.5,
  taxRate: 0.12,
};

function parseBooleanFlag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (value && typeof value === 'object' && 'enabled' in value) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return fallback;
}

function parseCheckoutPricing(value: unknown): CheckoutPricing {
  if (!value || typeof value !== 'object') return DEFAULT_CHECKOUT_PRICING;

  const payload = value as Record<string, unknown>;
  const rawDeliveryFee = Number(payload.delivery_fee ?? payload.deliveryFee);
  const rawTaxRate = Number(payload.tax_rate ?? payload.taxRate);

  return {
    deliveryFee: Number.isFinite(rawDeliveryFee) && rawDeliveryFee >= 0
      ? Number(rawDeliveryFee.toFixed(2))
      : DEFAULT_CHECKOUT_PRICING.deliveryFee,
    taxRate: Number.isFinite(rawTaxRate) && rawTaxRate >= 0 && rawTaxRate <= 1
      ? Number(rawTaxRate.toFixed(4))
      : DEFAULT_CHECKOUT_PRICING.taxRate,
  };
}

export async function getDriverHiringEnabled(): Promise<boolean> {
  if (!isSupabaseReady) return true;

  const { data, error } = await getSupabase()
    .from('app_config')
    .select('value')
    .eq('key', DRIVER_HIRING_KEY)
    .maybeSingle();

  if (error) return true;
  return parseBooleanFlag((data as AppConfigRow | null)?.value, true);
}

export async function setDriverHiringEnabled(enabled: boolean): Promise<void> {
  if (!isSupabaseReady) return;

  const { error } = await getSupabase()
    .from('app_config')
    .upsert(
      {
        key: DRIVER_HIRING_KEY,
        value: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) throw error;
}

export async function getCheckoutPricing(): Promise<CheckoutPricing> {
  if (!isSupabaseReady) return DEFAULT_CHECKOUT_PRICING;

  const { data, error } = await getSupabase()
    .from('app_config')
    .select('value')
    .eq('key', CHECKOUT_PRICING_KEY)
    .maybeSingle();

  if (error) return DEFAULT_CHECKOUT_PRICING;
  return parseCheckoutPricing((data as AppConfigRow | null)?.value);
}

export async function setCheckoutPricing(pricing: CheckoutPricing): Promise<void> {
  if (!isSupabaseReady) return;

  const deliveryFee = Number.isFinite(pricing.deliveryFee) ? Math.max(pricing.deliveryFee, 0) : DEFAULT_CHECKOUT_PRICING.deliveryFee;
  const taxRate = Number.isFinite(pricing.taxRate) ? Math.min(Math.max(pricing.taxRate, 0), 1) : DEFAULT_CHECKOUT_PRICING.taxRate;

  const { error } = await getSupabase()
    .from('app_config')
    .upsert(
      {
        key: CHECKOUT_PRICING_KEY,
        value: {
          delivery_fee: Number(deliveryFee.toFixed(2)),
          tax_rate: Number(taxRate.toFixed(4)),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) throw error;
}
