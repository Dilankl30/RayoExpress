import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

interface AuditEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

const mockAuditLog: AuditEntry[] = [];

export async function logAuditEvent(entry: AuditEntry) {
  if (!isSupabaseReady) {
    mockAuditLog.unshift({ ...entry, details: { ...entry.details, _mock: true } });
    return;
  }
  try {
    const supabase = getSupabase();
    await supabase.rpc('log_audit_event', {
      p_user_id: entry.userId,
      p_action: entry.action,
      p_entity_type: entry.entityType,
      p_entity_id: entry.entityId ?? null,
      p_details: entry.details ?? null,
    });
  } catch {
    console.warn('Audit log insert failed (non-critical)');
  }
}

export function getMockAuditLog() {
  return [...mockAuditLog];
}
