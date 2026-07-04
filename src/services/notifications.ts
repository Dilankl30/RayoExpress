import { getSupabase } from './supabase';

export async function getNotifications(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markAsRead(notificationId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}
