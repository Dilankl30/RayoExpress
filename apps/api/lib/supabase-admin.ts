import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from './env';

type AdminClient = ReturnType<typeof createClient>;

let adminClient: AdminClient | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
