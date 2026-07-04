import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export async function updateProfile(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string }) {
  if (!isSupabaseReady) return { ...data, id: userId };
  const supabase = getSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.full_name !== undefined) payload.full_name = data.full_name;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}
