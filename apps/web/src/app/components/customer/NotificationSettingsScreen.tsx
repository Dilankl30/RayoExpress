import { useEffect, useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_GROUPS,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from '../../../modules/notifications/application/notification-preferences.service';

export function NotificationSettingsScreen() {
  const { navigate, user } = useAuth();
  const [enabled, setEnabled] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const preferences = await getNotificationPreferences(user.id);
      if (active) {
        setEnabled(preferences);
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const toggle = async (key: NotificationPreferenceKey) => {
    if (!user?.id) return;

    const next = { ...enabled, [key]: !enabled[key] };
    setEnabled(next);
    setSavingKey(key);
    const saved = await saveNotificationPreferences(user.id, next);
    setEnabled(saved);
    setSavingKey(null);
  };

  return (
    <div className="min-h-screen bg-surface pb-12">
      <div className="pt-10 pb-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Notificaciones</h2>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
              <Bell size={24} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-text-primary font-medium">Preferencias de notificacion</p>
              <p className="text-xs text-text-secondary">Controla que notificaciones deseas recibir</p>
            </div>
          </div>
          {loading && <p className="text-xs text-text-secondary">Cargando preferencias...</p>}
        </div>

        {NOTIFICATION_PREFERENCE_GROUPS.map((group) => (
          <div key={group.title} className="bg-card rounded-2xl p-5 shadow-sm mb-3">
            <h3 className="text-sm font-bold text-text-primary mb-3">{group.title}</h3>
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-secondary">{item.description}</p>
                  </div>
                  <button
                    onClick={() => void toggle(item.key)}
                    disabled={loading || savingKey === item.key}
                    aria-label={item.label}
                    role="switch"
                    aria-checked={enabled[item.key]}
                    className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-60"
                    style={{ backgroundColor: enabled[item.key] ? 'var(--brand)' : '#D1D5DB' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                      style={{ transform: enabled[item.key] ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-text-secondary text-center mt-6 px-4">
          Recibiras notificaciones criticas de tu pedido en curso aunque desactives comunicaciones opcionales.
        </p>
      </div>
    </div>
  );
}
