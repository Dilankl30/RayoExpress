import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface DriverApplicationData {
  fullName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
}

const mockApplications: Array<DriverApplicationData & { id: string; status: string; userId: string }> = [];

export async function submitDriverApplication(userId: string, data: DriverApplicationData) {
  if (!isSupabaseReady) {
    const app = { id: `mock-app-${Date.now()}`, ...data, status: 'pending', userId };
    mockApplications.push(app);
    return app;
  }
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('driver_applications')
    .insert({
      user_id: userId,
      full_name: data.fullName,
      phone: data.phone,
      vehicle_type: data.vehicleType,
      vehicle_plate: data.vehiclePlate,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function getMyDriverApplication(userId: string) {
  if (!isSupabaseReady) {
    return mockApplications.find((a) => a.userId === userId) || null;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('driver_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
