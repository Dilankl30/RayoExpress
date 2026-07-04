import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCheck, X, Clock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `hace ${hrs}h`;
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
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-96 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs" style={{ color: '#6D28D9' }}>
                      <CheckCheck size={13} /> Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Bell size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin notificaciones</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { if (!n.read_at) markAsRead(n.id); }}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        style={{ backgroundColor: n.read_at ? 'transparent' : '#F5F3FF' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.read_at ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock size={10} className="text-gray-300" />
                            <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                        {!n.read_at && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#6D28D9' }} />}
                      </button>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
                    <X size={14} className="inline mr-1" />Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
