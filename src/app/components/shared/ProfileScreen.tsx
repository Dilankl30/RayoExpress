import {
  Bell, ChevronRight, CircleHelp, Heart, Info, LogOut, MapPin, Store, Ticket, User, Wallet, ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import type { Screen } from '../../../shared/types';

function MenuRow({ icon: Icon, label, sub, badge, onClick }: { icon: typeof User; label: string; sub?: string; badge?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 text-left border-b border-border-light last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
        <Icon size={20} style={{ color: 'var(--brand)' }} />
      </div>
      <span className="flex-1">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {sub && <span className="block text-xs text-text-secondary mt-0.5">{sub}</span>}
      </span>
      {badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--brand)' }}>{badge}</span>}
      <ChevronRight size={18} className="text-text-secondary" />
    </button>
  );
}

export function ProfileScreen() {
  const { user, navigate, logout } = useAuth();
  if (!user) return null;

  const quickActions = [
    { label: 'Perfil', icon: User, screen: 'personal-info' as Screen },
    { label: 'Cupones', icon: Ticket, screen: 'promotions' as Screen },
    { label: 'Rayo+', icon: Wallet, screen: 'wallet' as Screen },
    { label: 'Ayuda', icon: CircleHelp, screen: 'orders' as Screen },
  ] as const;

  return (
    <div className="min-h-screen bg-surface pb-16 lg:pb-10">
      <div className="lg:hidden pt-10 pb-6 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl text-white font-bold">
            {(user.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-lg">{user.full_name || 'Cliente'}</p>
            <p className="text-white/60 text-xs">{user.phone || 'Agrega tu teléfono'}</p>
          </div>
        </div>
      </div>

      <main className="px-4 -mt-4 lg:mt-0 lg:px-6 lg:pt-8 max-w-5xl mx-auto">
        <div className="hidden lg:flex items-center justify-between gap-6 mb-6">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Cuenta</p>
            <h1 className="text-3xl font-black text-text-primary">Mi perfil</h1>
            <p className="text-text-secondary mt-1">Administra tu información, direcciones, favoritos y preferencias.</p>
          </div>
          <div className="bg-card rounded-3xl p-4 flex items-center gap-4 shadow-sm min-w-72">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: 'var(--brand)' }}>
              {(user.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-text-primary truncate">{user.full_name || 'Cliente'}</p>
              <p className="text-sm text-text-secondary truncate">{user.phone || 'Cuenta RayoExpress'}</p>
            </div>
          </div>
        </div>

        <section className="bg-card rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-text-primary mb-1">Rayo Plus</h2>
          <p className="text-sm text-text-secondary">Envíos gratis y beneficios especiales para clientes frecuentes.</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '30%', backgroundColor: 'var(--brand)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>30%</span>
          </div>
        </section>

        <section className="bg-card rounded-2xl mt-3 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-3">Acceso rápido</h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            {quickActions.map(({ label, icon: Icon, screen }) => (
              <button key={label} onClick={() => navigate(screen)} className="space-y-1.5">
                <div className="h-14 rounded-2xl bg-surface flex items-center justify-center">
                  <Icon size={24} style={{ color: 'var(--brand)' }} />
                </div>
                <span className="block text-[11px] text-text-secondary">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-2xl mt-3 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-1">Perfil</h2>
          <MenuRow icon={MapPin} label="Direcciones" sub="Administra tus direcciones" onClick={() => navigate('addresses')} />
          <MenuRow icon={Heart} label="Favoritos" sub="Tus tiendas y productos favoritos" onClick={() => navigate('favorites')} />
          <MenuRow icon={ShoppingBag} label="Mis pedidos" sub="Historial de pedidos" onClick={() => navigate('orders')} />
        </section>

        <section className="bg-card rounded-2xl mt-3 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-1">Actividad</h2>
          <MenuRow icon={Wallet} label="Billetera RayoExpress" onClick={() => navigate('wallet')} />
          <MenuRow icon={Ticket} label="Cupones y promociones" sub="Códigos y descuentos" onClick={() => navigate('promotions')} />
        </section>

        <section className="bg-card rounded-2xl mt-3 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-1">Configuración</h2>
          <MenuRow icon={Bell} label="Notificaciones" sub="Personaliza tus alertas" onClick={() => navigate('notification-settings')} />
          <MenuRow icon={Info} label="Información legal" sub="Términos y condiciones" />
          <MenuRow icon={Store} label="Registrar mi negocio" sub="Únete como tienda" onClick={() => navigate('register-store')} />
          <button onClick={logout} className="w-full flex items-center gap-4 py-4 text-left border-b border-border-light last:border-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
              <LogOut size={20} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Cerrar sesión</span>
          </button>
        </section>
      </main>
    </div>
  );
}
