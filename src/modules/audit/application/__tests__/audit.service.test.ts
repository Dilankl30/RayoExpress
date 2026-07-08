import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabaseReady = vi.hoisted(() => ({ value: false }));
const mockGetSupabase = vi.hoisted(() => vi.fn());

vi.mock('../../../../integrations/supabase/client', () => ({
  get isSupabaseReady() { return mockSupabaseReady.value; },
  getSupabase: mockGetSupabase,
}));

import { logAuditEvent, getMockAuditLog } from '../audit.service';

const testEntry = {
  userId: 'user-1',
  action: 'test_action',
  entityType: 'order',
  entityId: 'order-1',
  details: { foo: 'bar' },
};

// getMockAuditLog runs first so the internal array starts fresh
describe('getMockAuditLog', () => {
  it('should return stored mock entries', async () => {
    await logAuditEvent(testEntry);
    await logAuditEvent({ ...testEntry, action: 'action2' });

    const log = getMockAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].action).toBe('action2');
    expect(log[1].action).toBe('test_action');
  });
});

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should call supabase.rpc when isSupabaseReady is true', async () => {
    mockSupabaseReady.value = true;
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ rpc: mockRpc });

    await logAuditEvent(testEntry);

    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', {
      p_user_id: 'user-1',
      p_action: 'test_action',
      p_entity_type: 'order',
      p_entity_id: 'order-1',
      p_details: { foo: 'bar' },
    });
  });

  it('should store in mock array when isSupabaseReady is false', async () => {
    await logAuditEvent(testEntry);
    const log = getMockAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    const added = log.find((e) => e.userId === 'user-1' && e.action === 'test_action');
    expect(added).toBeDefined();
    expect(added!.entityType).toBe('order');
  });

  it('should handle errors gracefully', async () => {
    mockSupabaseReady.value = true;
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetSupabase.mockReturnValue({ rpc: vi.fn().mockRejectedValue(new Error('DB error')) });

    await expect(logAuditEvent(testEntry)).resolves.toBeUndefined();
    expect(consoleWarn).toHaveBeenCalledWith('Audit log insert failed (non-critical)');
    consoleWarn.mockRestore();
  });
});
