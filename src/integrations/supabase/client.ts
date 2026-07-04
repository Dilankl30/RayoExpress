import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isMockMode } from '../../shared/lib/mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let _client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && !isMockMode) {
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const isSupabaseReady = !!_client;

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized. Check your .env file or use mock mode.');
  return _client;
}

export const supabase = _client;
