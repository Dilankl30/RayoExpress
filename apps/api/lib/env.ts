type RequiredEnvKey = 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY';

const cache = new Map<RequiredEnvKey, string>();

function readRequiredEnv(key: RequiredEnvKey): string {
  const cached = cache.get(key);
  if (cached) return cached;

  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  cache.set(key, value);
  return value;
}

export function getServerEnv() {
  return {
    supabaseUrl: readRequiredEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: readRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}
