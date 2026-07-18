import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export type NotificationPreferenceKey =
  | 'promotions'
  | 'coupons'
  | 'surveys'
  | 'news'
  | 'order_confirmed'
  | 'order_status'
  | 'chat_messages'
  | 'exclusive_offers';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  promotions: true,
  coupons: true,
  surveys: false,
  news: true,
  order_confirmed: true,
  order_status: true,
  chat_messages: true,
  exclusive_offers: false,
};

export const NOTIFICATION_PREFERENCE_GROUPS: Array<{
  title: string;
  items: Array<{ key: NotificationPreferenceKey; label: string; description: string }>;
}> = [
  {
    title: 'Promociones y ofertas',
    items: [
      { key: 'promotions', label: 'Promociones', description: 'Ofertas generales de tiendas y productos.' },
      { key: 'coupons', label: 'Cupones', description: 'Codigos y descuentos disponibles para usar.' },
      { key: 'exclusive_offers', label: 'Ofertas exclusivas', description: 'Beneficios personalizados de RayoExpress.' },
    ],
  },
  {
    title: 'Pedidos',
    items: [
      { key: 'order_confirmed', label: 'Pedidos confirmados', description: 'Confirmacion cuando la tienda acepta tu pedido.' },
      { key: 'order_status', label: 'Estado del pedido', description: 'Cambios de preparacion, retiro, ruta y entrega.' },
      { key: 'chat_messages', label: 'Mensajes del pedido', description: 'Mensajes de tienda, repartidor o soporte.' },
    ],
  },
  {
    title: 'Otros',
    items: [
      { key: 'surveys', label: 'Encuestas', description: 'Solicitudes para calificar tu experiencia.' },
      { key: 'news', label: 'Novedades', description: 'Nuevas funciones o secciones dentro de la app.' },
    ],
  },
];

const STORAGE_PREFIX = 'rayoexpress-notification-preferences:';

function normalizePreferences(input: unknown): NotificationPreferences {
  const raw = typeof input === 'object' && input !== null ? input as Partial<Record<NotificationPreferenceKey, unknown>> : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([key, fallback]) => [
      key,
      typeof raw[key as NotificationPreferenceKey] === 'boolean' ? raw[key as NotificationPreferenceKey] : fallback,
    ]),
  ) as NotificationPreferences;
}

function localStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readLocalPreferences(userId: string): NotificationPreferences {
  try {
    const stored = window.localStorage.getItem(localStorageKey(userId));
    return normalizePreferences(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

function writeLocalPreferences(userId: string, preferences: NotificationPreferences) {
  try {
    window.localStorage.setItem(localStorageKey(userId), JSON.stringify(preferences));
  } catch {
    // Local persistence is best-effort only.
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  if (!isSupabaseReady) return readLocalPreferences(userId);

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    const preferences = normalizePreferences(data?.preferences);
    writeLocalPreferences(userId, preferences);
    return preferences;
  } catch {
    return readLocalPreferences(userId);
  }
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const normalized = normalizePreferences(preferences);
  writeLocalPreferences(userId, normalized);

  if (!isSupabaseReady) return normalized;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          preferences: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) throw error;
  } catch {
    // Keep the local value so the UI remains stable if the migration is pending.
  }

  return normalized;
}
