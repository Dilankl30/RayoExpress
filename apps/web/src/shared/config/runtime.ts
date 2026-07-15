type RuntimeMode = 'mock' | 'supabase';

function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getRuntimeMode(): RuntimeMode {
  return readEnv('VITE_MOCK_MODE') === 'true' ? 'mock' : 'supabase';
}

export function getSupabaseConfig() {
  const url = readEnv('VITE_SUPABASE_URL');
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY') ?? readEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

  return {
    url,
    anonKey,
    ready: getRuntimeMode() === 'supabase' && !!url && !!anonKey,
  };
}

