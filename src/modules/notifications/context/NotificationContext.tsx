import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../../../services/notifications';
import { isSupabaseReady, getSupabase } from '../../../integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(userId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    if (!userIdRef.current) { setNotifications([]); setLoading(false); return; }
    try {
      const data = await getNotifications(userIdRef.current);
      setNotifications(data as Notification[]);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    if (isSupabaseReady) {
      try {
        const supabase = getSupabase();
        const channel = supabase
          .channel('notifications-realtime')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload: RealtimePostgresChangesPayload<Notification>) => {
              const newNotif = payload.new as Notification;
              if (newNotif) {
                setNotifications((prev) => [newNotif, ...prev]);
              }
            }
          )
          .subscribe();
        channelRef.current = channel;
      } catch { /* noop */ }
    } else {
      intervalRef.current = setInterval(refresh, 30000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (channelRef.current) {
        try { channelRef.current.unsubscribe(); } catch { /* noop */ }
      }
    };
  }, [userId, refresh]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userIdRef.current) return;
    await markAllAsRead(userIdRef.current);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead: handleMarkAsRead, markAllAsRead: handleMarkAllAsRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
