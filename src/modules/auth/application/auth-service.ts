import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import { hashText } from '../../../shared/validation';
import { logAuditEvent } from '../../audit/application/audit.service';
import { checkRateLimit, recordAttempt, resetAttempts } from '../../../shared/auth/rate-limiter';
import type { Role } from '../../../shared/types';

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  is_suspended: boolean;
};

export async function loginUser(email: string, password: string) {
  if (!isSupabaseReady) throw new Error('Supabase not configured');

  if (!checkRateLimit(email, 5, 15 * 60 * 1000)) {
    throw new Error('Demasiados intentos. Intenta de nuevo en 15 minutos.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    recordAttempt(email);
    logAuditEvent({ userId: '', action: 'LOGIN_FAILED', entityType: 'user', details: { email } }).catch(() => {});
    throw error;
  }
  resetAttempts(email);
  logAuditEvent({ userId: data.user?.id ?? '', action: 'LOGIN', entityType: 'user', details: { email } }).catch(() => {});
  return data;
}

export async function registerUser(email: string, password: string, options?: { data?: Record<string, unknown> }) {
  if (!isSupabaseReady) throw new Error('Supabase not configured');
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password, options });
  if (error) throw error;
  logAuditEvent({ userId: data.user?.id ?? '', action: 'REGISTER', entityType: 'user', entityId: data.user?.id, details: { email } }).catch(() => {});
  return data;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, avatar_url, is_suspended')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(userId: string, data?: Partial<Profile>) {
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const payload: Record<string, unknown> = {
    id: userId,
    full_name: data?.full_name ?? null,
    phone: data?.phone ?? null,
    avatar_url: data?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateUserRole(userId: string, newRole: Role): Promise<void> {
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const { error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_new_role: newRole,
  });
  if (error) throw error;
}

export async function saveSecurityQuestion(userId: string, question: string, answer: string) {
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const answerHash = await hashText(answer);
  const { error } = await supabase.from('password_recovery_questions').upsert({
    user_id: userId,
    question,
    answer_hash: answerHash,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function verifySecurityAnswer(userId: string, answer: string): Promise<boolean> {
  if (!isSupabaseReady) return false;
  const supabase = getSupabase();
  const answerHash = await hashText(answer);
  const { data, error } = await supabase
    .from('password_recovery_questions')
    .select('answer_hash')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.answer_hash === answerHash;
}

export async function getRecoveryQuestion(userId: string): Promise<string | null> {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('password_recovery_questions')
    .select('question')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.question;
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseReady) throw new Error('Mock mode: no email service configured');
  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  logAuditEvent({ userId: '', action: 'PASSWORD_RESET_REQUESTED', entityType: 'user', details: { email } }).catch(() => {});
}
