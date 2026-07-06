import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';

const groups = {
  Pushes: [
    ['Promociones', 'Enterate de ofertas y promociones exclusivas.'],
    ['Cupones', 'No te pierdas cupones ni descuentos.'],
    ['Encuestas', 'Opina sobre tu experiencia en la app.'],
    ['Novedades', 'Descubre nuevas secciones y funciones.'],
    ['Desafios', 'Sigue el estado de tus desafios y premios.'],
  ],
  'E-mails': [
    ['Pedidos confirmados', 'Recibe la confirmacion de tus pedidos por e-mail.'],
  ],
};

export function NotificationSettingsScreen() {
  const { navigate } = useAuth();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    Promociones: true,
    Cupones: true,
    Encuestas: true,
    Novedades: true,
    Desafios: true,
    'Pedidos confirmados': false,
  });

  return (
    <div className="min-h-screen bg-white px-4 pt-10 pb-12">
      <button onClick={() => navigate('profile')} aria-label="Volver" className="w-10 h-10 flex items-center justify-center mb-8"><ArrowLeft size={24} /></button>
      <h1 className="text-3xl font-bold text-[#12001f]">Notificaciones</h1>
      <p className="text-gray-600 mt-3 text-lg">Recuerda que vas a recibir notificaciones de tu pedido en curso, pero podras personalizar las siguientes comunicaciones:</p>
      {Object.entries(groups).map(([title, items]) => (
        <section key={title} className="mt-8">
          <h2 className="text-3xl font-bold text-[#12001f] mb-4">{title}</h2>
          <div className="space-y-6">
            {items.map(([label, description]) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl text-[#12001f]">{label}</h3>
                  <p className="text-gray-500">{description}</p>
                </div>
                <button
                  onClick={() => setEnabled((prev) => ({ ...prev, [label]: !prev[label] }))}
                  aria-label={label}
                  role="switch"
                  aria-checked={enabled[label]}
                  className="w-16 h-9 rounded-full p-1 transition"
                  style={{ background: enabled[label] ? '#12001f' : '#fff', border: enabled[label] ? '0' : '2px solid #12001f' }}
                >
                  <span className="block w-7 h-7 rounded-full bg-white transition-transform" style={{ transform: enabled[label] ? 'translateX(28px)' : 'translateX(0)', background: enabled[label] ? '#fff' : '#12001f' }} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
