import { isSupabaseReady, getSupabase } from '../../../integrations/supabase/client';
import {
  getMockAddresses, addMockAddress, updateMockAddress, deleteMockAddress, setDefaultMockAddress,
  getMockFavorites, toggleMockFavorite, isMockFavorite,
} from '../../../shared/lib/mockData';
import { logAuditEvent } from '../../audit/application/audit.service';
import type { Address } from '../../../shared/types';

export async function getAddresses(userId: string): Promise<Address[]> {
  if (!isSupabaseReady) return getMockAddresses(userId) as Address[];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAddress(userId: string, address: Omit<Address, 'id'>): Promise<Address[]> {
  if (!isSupabaseReady) return addMockAddress(userId, address) as Address[];
  const supabase = getSupabase();
  const { error } = await supabase.from('addresses').insert({ ...address, user_id: userId });
  if (error) throw error;
  return getAddresses(userId);
}

export async function editAddress(userId: string, addressId: string, updates: Partial<Address>): Promise<Address[]> {
  if (!isSupabaseReady) return updateMockAddress(userId, addressId, updates) as Address[];
  const supabase = getSupabase();
  const { error } = await supabase.from('addresses').update(updates).eq('id', addressId).eq('user_id', userId);
  if (error) throw error;
  return getAddresses(userId);
}

export async function removeAddress(userId: string, addressId: string): Promise<Address[]> {
  if (!isSupabaseReady) return deleteMockAddress(userId, addressId) as Address[];
  const supabase = getSupabase();
  const { error } = await supabase.from('addresses').delete().eq('id', addressId).eq('user_id', userId);
  if (error) throw error;
  return getAddresses(userId);
}

export async function markDefaultAddress(userId: string, addressId: string): Promise<Address[]> {
  if (!isSupabaseReady) return setDefaultMockAddress(userId, addressId) as Address[];
  const supabase = getSupabase();
  const { error: reset } = await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
  if (reset) throw reset;
  const { error: set } = await supabase.from('addresses').update({ is_default: true }).eq('id', addressId).eq('user_id', userId);
  if (set) throw set;
  return getAddresses(userId);
}

export async function getFavorites(userId: string) {
  if (!isSupabaseReady) return getMockFavorites(userId);
  const supabase = getSupabase();
  const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function toggleFavorite(userId: string, item: { id: string; kind: string; name: string; subtitle: string; emoji: string; price?: number; storeId?: string }) {
  if (!isSupabaseReady) return toggleMockFavorite(userId, item);
  const supabase = getSupabase();
  const exists = await supabase.from('favorites').select('id').eq('user_id', userId).eq('item_id', item.id).eq('kind', item.kind).maybeSingle();
  if (exists.data) {
    const { error } = await supabase.from('favorites').delete().eq('id', exists.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, item_id: item.id, kind: item.kind, name: item.name, subtitle: item.subtitle, emoji: item.emoji, price: item.price });
    if (error) throw error;
  }
  return getFavorites(userId);
}

export async function checkIsFavorite(userId: string, id: string, kind: string): Promise<boolean> {
  if (!isSupabaseReady) return isMockFavorite(userId, id, kind);
  const supabase = getSupabase();
  const { data } = await supabase.from('favorites').select('id').eq('user_id', userId).eq('item_id', id).eq('kind', kind).maybeSingle();
  return !!data;
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string; avatar_url?: string }) {
  if (!isSupabaseReady) {
    logAuditEvent({ userId, action: 'PROFILE_UPDATED', entityType: 'profile', entityId: userId, details: updates }).catch(() => {});
    return { id: userId, ...updates };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  logAuditEvent({ userId, action: 'PROFILE_UPDATED', entityType: 'profile', entityId: userId, details: updates }).catch(() => {});
  return data;
}
