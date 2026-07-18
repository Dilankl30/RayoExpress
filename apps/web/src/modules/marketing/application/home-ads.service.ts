import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

const HOME_ADS_KEY = 'home_ads';

export type HomeAdMediaType = 'none' | 'image' | 'video';

export type HomeAd = {
  id: string;
  title: string;
  subtitle: string;
  cta_label: string;
  target_path: string;
  bg: string;
  text_color: string;
  media_type: HomeAdMediaType;
  media_url: string;
  active: boolean;
  sort_order: number;
};

type AppConfigRow = { value?: unknown };

export const DEFAULT_HOME_ADS: HomeAd[] = [
  {
    id: 'default-free-delivery',
    title: '¡Envío GRATIS!',
    subtitle: 'En tu primer pedido · Código RAYO15',
    cta_label: 'Aprovechar →',
    target_path: '/promotions',
    bg: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)',
    text_color: '#4C1D95',
    media_type: 'none',
    media_url: '',
    active: true,
    sort_order: 0,
  },
  {
    id: 'default-restaurants-off',
    title: '20% OFF Restaurantes',
    subtitle: 'Solo hoy hasta las 22:00',
    cta_label: 'Ver promos →',
    target_path: '/promotions',
    bg: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
    text_color: '#FFFFFF',
    media_type: 'none',
    media_url: '',
    active: true,
    sort_order: 1,
  },
  {
    id: 'default-super-express',
    title: 'Súper Express 24h',
    subtitle: 'Entrega en minutos',
    cta_label: 'Comprar →',
    target_path: '/super',
    bg: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
    text_color: '#FFD400',
    media_type: 'none',
    media_url: '',
    active: true,
    sort_order: 2,
  },
];

function isHomeAd(value: unknown): value is HomeAd {
  if (!value || typeof value !== 'object') return false;
  const ad = value as Partial<HomeAd>;
  return typeof ad.id === 'string'
    && typeof ad.title === 'string'
    && typeof ad.subtitle === 'string'
    && typeof ad.cta_label === 'string'
    && typeof ad.target_path === 'string'
    && typeof ad.bg === 'string'
    && typeof ad.text_color === 'string'
    && ['none', 'image', 'video'].includes(String(ad.media_type))
    && typeof ad.media_url === 'string'
    && typeof ad.active === 'boolean'
    && typeof ad.sort_order === 'number';
}

function normalizeHomeAds(value: unknown): HomeAd[] {
  const rawAds = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { ads?: unknown }).ads)
      ? (value as { ads: unknown[] }).ads
      : [];

  const ads = rawAds.filter(isHomeAd).sort((a, b) => a.sort_order - b.sort_order);
  return ads.length > 0 ? ads : DEFAULT_HOME_ADS;
}

export async function getHomeAds(): Promise<HomeAd[]> {
  if (!isSupabaseReady) return DEFAULT_HOME_ADS;

  const { data, error } = await getSupabase()
    .from('app_config')
    .select('value')
    .eq('key', HOME_ADS_KEY)
    .maybeSingle();

  if (error) return DEFAULT_HOME_ADS;
  return normalizeHomeAds((data as AppConfigRow | null)?.value);
}

export async function saveHomeAds(ads: HomeAd[]): Promise<void> {
  if (!isSupabaseReady) return;

  const normalized = ads.map((ad, index) => ({
    ...ad,
    sort_order: index,
    media_type: ad.media_type || 'none',
    media_url: ad.media_url || '',
    target_path: ad.target_path || '/promotions',
  }));

  const { error } = await getSupabase()
    .from('app_config')
    .upsert(
      {
        key: HOME_ADS_KEY,
        value: { ads: normalized },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) throw error;
}
