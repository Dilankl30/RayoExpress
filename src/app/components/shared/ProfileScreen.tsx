import {
  Bell,
  ChevronRight,
  CircleHelp,
  Heart,
  Info,
  LogOut,
  MapPin,
  Store,
  Ticket,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';

function MenuRow({
  icon: Icon,
  label,
  sub,
  badge,
  onClick,
}: {
  icon: typeof User;
  label: string;
  sub?: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 text-left">
      <Icon size={28} className="text-[#12001f]" />
      <span className="flex-1">
        <span className="text-lg text-[#12001f]">{label}</span>
        {sub && <span className="block text-sm text-gray-500">{sub}</span>}
      </span>
      {badge && <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-bold text-[#12001f]">{badge}</span>}
      <ChevronRight size={28} className="text-[#12001f]" />
    </button>
  );
}

export function ProfileScreen() {
  const { user, navigate, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-white pb-28">
      <header className="px-4 pt-12 pb-6 text-center">
        <div className="flex items-center justify-end">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
            {(user.full_name || 'R').charAt(0).toLowerCase()}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#12001f]">Hola, {user.full_name || 'cliente'}!</h1>
      </header>

      <main className="px-4 space-y-8">
        <section className="rounded-2xl bg-[#3B0099] text-white p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white text-[#3B0099] flex items-center justify-center font-bold">plus</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Prueba Plus!</h2>
            <p className="text-white/85 text-sm">Envios gratis y beneficios especiales para clientes frecuentes.</p>
          </div>
          <ChevronRight />
        </section>

        <section className="grid grid-cols-4 gap-3 text-center">
          {[
            ['Informacion personal', User, 'personal-info'],
            ['Cupones', Ticket, 'promotions'],
            ['Rayo Plus', Wallet, 'wallet'],
            ['Ayuda', CircleHelp, 'orders'],
          ].map(([label, Icon, screen]) => (
            <button key={label as string} onClick={() => navigate(screen as any)} className="space-y-2">
              <span className="h-16 rounded-2xl bg-[#F3F3F5] flex items-center justify-center"><Icon size={26} /></span>
              <span className="block text-sm text-[#12001f]">{label as string}</span>
            </button>
          ))}
        </section>

        <section className="rounded-2xl bg-[#F3F3F5] p-5">
          <h2 className="text-xl font-bold text-[#12001f]">Completa tu perfil</h2>
          <p className="text-gray-600">1 de 3</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <span className="h-1.5 rounded-full bg-[#12001f]" />
            <span className="h-1.5 rounded-full bg-gray-200" />
            <span className="h-1.5 rounded-full bg-gray-200" />
          </div>
          <p className="text-gray-500 mt-2">Describe como se compone tu hogar.</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-[#12001f] mb-2">Perfil</h2>
          <MenuRow icon={MapPin} label="Direcciones" onClick={() => navigate('addresses')} />
          <MenuRow icon={Heart} label="Favoritos" onClick={() => navigate('favorites')} />
          <MenuRow icon={Users} label="Grupo familiar" badge="Nuevo" onClick={() => navigate('wallet')} />
        </section>

        <section>
          <h2 className="text-3xl font-bold text-[#12001f] mb-2">Actividad</h2>
          <MenuRow icon={Wallet} label="Billetera RayoExpress" onClick={() => navigate('wallet')} />
          <MenuRow icon={Ticket} label="Cupones y promociones" onClick={() => navigate('promotions')} />
        </section>

        <section>
          <h2 className="text-3xl font-bold text-[#12001f] mb-2">Configuracion</h2>
          <MenuRow icon={Bell} label="Notificaciones" onClick={() => navigate('notification-settings')} />
          <MenuRow icon={Info} label="Informacion legal" />
          <MenuRow icon={Store} label="Registrar mi negocio" onClick={() => navigate('register-store')} />
          <button onClick={logout} className="w-full flex items-center gap-4 py-4 text-left text-[#12001f]">
            <LogOut size={28} />
            <span className="text-lg">Cerrar sesion</span>
          </button>
        </section>
      </main>
    </div>
  );
}
