import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../../../integrations/supabase/client', () => ({
  supabase: null,
  getSupabase: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
  isSupabaseReady: true,
}));

import { upsertProfile, updateUserRole } from '../auth-service';

describe('upsertProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not accept a role parameter', async () => {
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));

    await upsertProfile('user-1', {
      full_name: 'Test User',
      phone: '+1234567890',
    });

    const upsertMock = mockFrom.mock.results[0].value.upsert;
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const payload = upsertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty('role');
    expect(payload.full_name).toBe('Test User');
  });
});

describe('updateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls admin_set_user_role RPC', async () => {
    mockRpc.mockResolvedValue({ error: null });

    await updateUserRole('user-1', 'driver');

    expect(mockRpc).toHaveBeenCalledWith('admin_set_user_role', {
      p_user_id: 'user-1',
      p_new_role: 'driver',
    });
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ error: new Error('Forbidden') });

    await expect(updateUserRole('user-1', 'admin')).rejects.toThrow('Forbidden');
  });
});
