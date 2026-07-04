import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface StoreApplicationData {
  storeName: string;
  description: string;
  address: string;
  phone: string;
}

const mockApplications: Array<StoreApplicationData & { id: string; status: string; userId: string }> = [];

export async function submitStoreApplication(userId: string, data: StoreApplicationData) {
  if (!isSupabaseReady) {
    const app = { id: `mock-app-${Date.now()}`, ...data, status: 'pending', userId };
    mockApplications.push(app);
    return app;
  }
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('store_applications')
    .insert({
      user_id: userId,
      store_name: data.storeName,
      description: data.description,
      address: data.address,
      phone: data.phone,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function getMyStoreApplication(userId: string) {
  if (!isSupabaseReady) {
    return mockApplications.find((a) => a.userId === userId) || null;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('store_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
