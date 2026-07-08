import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface PendingStoreApp {
  id: string;
  user_id: string;
  store_name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  applicant?: { full_name: string | null; email: string | null };
}

export interface PendingDriverApp {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  status: 'pending' | 'docs_verified' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  motorcycle_docs_url?: string | null;
  license_url?: string | null;
  contract_url?: string | null;
  accepted_terms?: boolean | null;
  applicant?: { full_name: string | null; email: string | null };
}

const mockStoreApps: PendingStoreApp[] = [
  { id: 'mock-s-1', user_id: 'mock-u-1', store_name: 'Pizzería Napoli', description: 'Pizza artesanal', address: 'Av. Principal 123', phone: '0999999991', status: 'pending', rejection_reason: null, created_at: new Date(Date.now() - 3600000).toISOString(), applicant: { full_name: 'Carlos Pérez', email: 'carlos@mail.com' } },
  { id: 'mock-s-2', user_id: 'mock-u-2', store_name: 'Sushi House', description: 'Sushi y cocina japonesa', address: 'Calle Secundaria 456', phone: '0999999992', status: 'pending', rejection_reason: null, created_at: new Date(Date.now() - 7200000).toISOString(), applicant: { full_name: 'María García', email: 'maria@mail.com' } },
];

const mockDriverApps: PendingDriverApp[] = [
  { id: 'mock-d-1', user_id: 'mock-u-3', full_name: 'Luis Martínez', phone: '0999999993', email: 'luis@mail.com', vehicle_type: 'moto', vehicle_plate: 'ABC-123', status: 'pending', rejection_reason: null, created_at: new Date(Date.now() - 1800000).toISOString(), id_card_front_url: 'https://placehold.co/400x300/EEE/999?text=Cedula+Frente', id_card_back_url: 'https://placehold.co/400x300/EEE/999?text=Cedula+Dorso', motorcycle_docs_url: 'https://placehold.co/400x300/EEE/999?text=Papeles', license_url: 'https://placehold.co/400x300/EEE/999?text=Licencia', contract_url: 'https://placehold.co/400x300/EEE/999?text=Contrato', accepted_terms: true, applicant: { full_name: 'Luis Martínez', email: 'luis@mail.com' } },
  { id: 'mock-d-2', user_id: 'mock-u-4', full_name: 'Ana Rodríguez', phone: '0999999994', email: 'ana@mail.com', vehicle_type: 'bicicleta', vehicle_plate: '', status: 'pending', rejection_reason: null, created_at: new Date(Date.now() - 5400000).toISOString(), id_card_front_url: 'https://placehold.co/400x300/EEE/999?text=Cedula+Frente', id_card_back_url: 'https://placehold.co/400x300/EEE/999?text=Cedula+Dorso', motorcycle_docs_url: null, license_url: 'https://placehold.co/400x300/EEE/999?text=Licencia', contract_url: null, accepted_terms: true, applicant: { full_name: 'Ana Rodríguez', email: 'ana@mail.com' } },
];

export async function getPendingStoreApplications(): Promise<PendingStoreApp[]> {
  if (!isSupabaseReady) return mockStoreApps;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('store_applications')
    .select('*, applicant:profiles!user_id(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingStoreApp[];
}

export async function getAllStoreApplications(): Promise<PendingStoreApp[]> {
  if (!isSupabaseReady) return mockStoreApps;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('store_applications')
    .select('*, applicant:profiles!user_id(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingStoreApp[];
}

export async function getPendingDriverApplications(): Promise<PendingDriverApp[]> {
  if (!isSupabaseReady) return mockDriverApps;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('driver_applications')
    .select('*, applicant:profiles!user_id(full_name)')
    .in('status', ['pending', 'docs_verified'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingDriverApp[];
}

export async function getAllDriverApplications(): Promise<PendingDriverApp[]> {
  if (!isSupabaseReady) return mockDriverApps;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('driver_applications')
    .select('*, applicant:profiles!user_id(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingDriverApp[];
}

export async function approveStoreApplication(applicationId: string, notes?: string) {
  if (!isSupabaseReady) {
    const app = mockStoreApps.find((a) => a.id === applicationId);
    if (app) app.status = 'approved';
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_approve_store_application', {
    p_application_id: applicationId,
    p_review_notes: notes ?? '',
  });
  if (error) throw error;
  return data as { ok: boolean; store_id: string };
}

export async function rejectStoreApplication(applicationId: string, reason: string) {
  if (!isSupabaseReady) {
    const app = mockStoreApps.find((a) => a.id === applicationId);
    if (app) { app.status = 'rejected'; app.rejection_reason = reason; }
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_reject_store_application', {
    p_application_id: applicationId,
    p_rejection_reason: reason,
  });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function approveDriverApplication(applicationId: string, notes?: string) {
  if (!isSupabaseReady) {
    const app = mockDriverApps.find((a) => a.id === applicationId);
    if (app) app.status = 'approved';
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_approve_driver_application', {
    p_application_id: applicationId,
    p_review_notes: notes ?? '',
  });
  if (error) throw error;
  return data as { ok: boolean; driver_id: string };
}

export async function rejectDriverApplication(applicationId: string, reason: string) {
  if (!isSupabaseReady) {
    const app = mockDriverApps.find((a) => a.id === applicationId);
    if (app) { app.status = 'rejected'; app.rejection_reason = reason; }
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_reject_driver_application', {
    p_application_id: applicationId,
    p_rejection_reason: reason,
  });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function verifyDriverDocuments(applicationId: string, notes?: string) {
  if (!isSupabaseReady) {
    const app = mockDriverApps.find((a) => a.id === applicationId);
    if (app) app.status = 'docs_verified';
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_verify_driver_documents', {
    p_application_id: applicationId,
    p_review_notes: notes ?? '',
  });
  if (error) throw error;
  return data as { ok: boolean; application_id: string; new_status: string };
}

export async function signDriverContract(applicationId: string, notes?: string) {
  if (!isSupabaseReady) {
    const app = mockDriverApps.find((a) => a.id === applicationId);
    if (app) { app.status = 'approved'; }
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_sign_driver_contract', {
    p_application_id: applicationId,
    p_review_notes: notes ?? '',
  });
  if (error) throw error;
  return data as { ok: boolean; driver_id: string; application_id: string };
}

export async function getDriverApplicationById(applicationId: string): Promise<PendingDriverApp | null> {
  if (!isSupabaseReady) {
    return mockDriverApps.find((a) => a.id === applicationId) ?? null;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('driver_applications')
    .select('*, applicant:profiles!user_id(full_name)')
    .eq('id', applicationId)
    .single();
  if (error) throw error;
  return data as PendingDriverApp | null;
}
