import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface DriverApplicationData {
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  motorcycleDocsUrl: string;
  licenseUrl: string;
  contractUrl: string;
  acceptedTerms: boolean;
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
      email: data.email,
      vehicle_type: data.vehicleType,
      vehicle_plate: data.vehiclePlate,
      id_card_front_url: data.idCardFrontUrl,
      id_card_back_url: data.idCardBackUrl,
      motorcycle_docs_url: data.motorcycleDocsUrl,
      license_url: data.licenseUrl,
      contract_url: data.contractUrl,
      accepted_terms: data.acceptedTerms,
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
