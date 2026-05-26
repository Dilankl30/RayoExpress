import type { Role } from '../types';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
};

export async function upsertProfile(userId: string, role: Role, data?: Partial<Profile>) {
  const payload = {
    id: userId,
    role,
    full_name: data?.full_name ?? null,
    phone: data?.phone ?? null,
    avatar_url: data?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}
