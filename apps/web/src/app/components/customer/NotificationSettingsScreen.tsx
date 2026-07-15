import { useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';

const DEFAULT_SETTINGS: Record<string, boolean> = {
  'Promociones': true,
  'Cupones': true,
  'Encuestas': true,
  'Novedades': true,
  'Desafíos': true,
  'Pedidos confirmados': false,
  'Estado del pedido': true,
  'Ofertas exclusivas': false,
};

export function NotificationSettingsScreen() {
  const { navigate } = useAuth();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(DEFAULT_SETTINGS);

  const toggle = (label: string) => {
    setEnabled((prev) => ({ ...prev, [label]: !prev[label] }));
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
              <p className="text-text-primary font-medium">Preferencias de notificación</p>
              <p className="text-xs text-text-secondary">Controla qué notificaciones deseas recibir</p>
            </div>
          </div>
        </div>

        {['Promociones y ofertas', 'Pedidos', 'Otros'].map((group) => {
          const items = Object.entries(DEFAULT_SETTINGS).filter(([label]) => {
            if (group === 'Promociones y ofertas') return ['Promociones', 'Cupones', 'Ofertas exclusivas'].includes(label);
            if (group === 'Pedidos') return ['Pedidos confirmados', 'Estado del pedido'].includes(label);
            return ['Encuestas', 'Novedades', 'Desafíos'].includes(label);
          });

          if (items.length === 0) return null;

          return (
            <div key={group} className="bg-card rounded-2xl p-5 shadow-sm mb-3">
              <h3 className="text-sm font-bold text-text-primary mb-3">{group}</h3>
              <div className="space-y-4">
                {items.map(([label]) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{label}</p>
                    </div>
                    <button
                      onClick={() => toggle(label)}
                      aria-label={label}
                      role="switch"
                      aria-checked={enabled[label]}
                      className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
                      style={{ backgroundColor: enabled[label] ? 'var(--brand)' : '#D1D5DB' }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                        style={{ transform: enabled[label] ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-text-secondary text-center mt-6 px-4">
          Recibirás notificaciones de tu pedido en curso sin importar estas preferencias.
        </p>
      </div>
    </div>
  );
}
