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
    await supabase.from('audit_log').insert({
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      details: entry.details ?? null,
    });
  } catch {
    console.warn('Audit log insert failed (non-critical)');
  }
}

export function getMockAuditLog() {
  return [...mockAuditLog];
}
