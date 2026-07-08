import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabaseReady = vi.hoisted(() => ({ value: false }));
const mockGetSupabase = vi.hoisted(() => vi.fn());

vi.mock('../../../../integrations/supabase/client', () => ({
  get isSupabaseReady() { return mockSupabaseReady.value; },
  getSupabase: mockGetSupabase,
}));

const mockNotificationsData: Record<string, any[]> = {
  'user-1': [
    { id: 'n1', user_id: 'user-1', title: 'Notificación 1', body: 'Cuerpo 1', read_at: null, created_at: '2026-01-01T00:00:00Z' },
  ],
  'user-empty': [],
};

vi.mock('../../../../shared/lib/mockData', () => ({
  get mockNotifications() { return mockNotificationsData; },
}));

import { getNotifications, markAsRead, markAllAsRead } from '../notification-service';

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should return mock notifications when Supabase is not ready', async () => {
    const notifications = await getNotifications('user-1');
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('n1');
  });

  it('should return empty array when no notifications for user', async () => {
    const notifications = await getNotifications('user-empty');
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications).toHaveLength(0);
  });
});

describe('markAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should handle Supabase not ready gracefully', async () => {
    await expect(markAsRead('n1')).resolves.toBeUndefined();
  });
});

describe('markAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseReady.value = false;
  });

  it('should handle errors gracefully', async () => {
    await expect(markAllAsRead('user-1')).resolves.toBeUndefined();
  });
});
