import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCheck, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/context/AuthContext';
import { useNotifications, type Notification } from '../context/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read_at) {
      markAsRead(n.id);
    }
    setOpen(false);

    if (!user) return;

    const orderId = typeof n.data?.order_id === 'string' ? n.data.order_id : undefined;
    const stateParams = orderId ? { tab: 'orders', openOrderId: orderId } : { tab: 'orders' };

    if (user.role === 'store') {
      navigate('/store-admin', { state: stateParams });
    } else if (user.role === 'driver') {
      navigate('/driver', { state: stateParams });
    } else if (user.role === 'admin') {
      navigate('/admin', { state: stateParams });
    } else if (user.role === 'customer') {
      navigate('/orders', { state: stateParams });
    }
  };

  return (
    <div className="relative">
      <button className="relative" onClick={() => setOpen(!open)}>
        <Bell size={22} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={() => setOpen(false)} />
            
            <motion.div
              className="fixed top-16 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-96"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={16} style={{ color: 'var(--brand)' }} />
                    <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors" style={{ color: 'var(--brand)' }}>
                        <CheckCheck size={13} /> Leer todas
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-hover text-text-secondary">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Drag indicator for mobile */}
                <div className="sm:hidden flex justify-center py-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center text-text-secondary">
                      <Bell size={28} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">Sin notificaciones</p>
                      <p className="text-xs mt-1 opacity-70">Las notificaciones aparecerán aquí</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-surface-hover active:bg-surface-hover transition-colors border-b border-border-light last:border-0"
                        style={{ backgroundColor: n.read_at ? 'transparent' : 'rgba(139, 92, 246, 0.04)' }}
                      >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: n.read_at ? 'var(--surface-hover)' : 'var(--brand-light)' }}>
                          <Bell size={14} style={{ color: n.read_at ? 'var(--text-secondary)' : 'var(--brand)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${n.read_at ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {n.body}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock size={10} className="text-text-secondary opacity-60" />
                            <span className="text-[10px] text-text-secondary opacity-60">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                        {!n.read_at && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: 'var(--brand)' }} />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

