import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

const DRIVER_HIRING_KEY = 'driver_hiring_enabled';

type AppConfigRow = { value?: unknown };

function parseBooleanFlag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (value && typeof value === 'object' && 'enabled' in value) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return fallback;
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
