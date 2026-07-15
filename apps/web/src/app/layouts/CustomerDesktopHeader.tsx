import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  MapPin,
  Search,
  ShoppingCart,
  User,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useCart } from '../../modules/cart/context/CartContext';
import { getAddresses } from '../../modules/client/application/client-service';
import { ADDRESS_UPDATED_EVENT, LocationDialog } from '../components/customer/LocationDialog';
import type { Address } from '../../shared/types';

const customerMenu = [
  { label: 'Inicio', path: '/home', icon: Home },
  { label: 'Explorar locales', path: '/explore', icon: Compass },
  { label: 'Mis direcciones', path: '/addresses', icon: MapPin },
  { label: 'Mis favoritos', path: '/favorites', icon: Heart },
  { label: 'Mis pedidos', path: '/orders', icon: ClipboardList },
  { label: 'Mi perfil', path: '/profile', icon: User },
  { label: 'Ayuda', path: '/orders', icon: HelpCircle },
];

export function CustomerDesktopHeader() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showLocation, setShowLocation] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState('');

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? addresses[0],
    [addresses],
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    getAddresses(user.id)
      .then((items) => {
        if (active) setAddresses(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.pathname, user]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const custom = event as CustomEvent<Address[]>;
      if (custom.detail) setAddresses(custom.detail);
      if (user) getAddresses(user.id).then(setAddresses).catch(() => {});
    };
    window.addEventListener(ADDRESS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(ADDRESS_UPDATED_EVENT, refresh);
  }, [user]);

  if (!user || user.role !== 'customer') return null;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    routerNavigate(query ? `/home?q=${encodeURIComponent(query)}` : '/home');
  };

  return (
    <>
      <header className="hidden lg:block sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border-light shadow-sm">
        <div className="max-w-7xl mx-auto h-20 px-6 flex items-center gap-6">
          <button onClick={() => routerNavigate('/home')} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: 'var(--brand)' }}>
              R
            </div>
            <span className="font-black text-xl tracking-tight" style={{ color: 'var(--brand)' }}>
              RayoExpress
            </span>
          </button>

          <button
            onClick={() => setShowLocation(true)}
            className="flex items-center gap-2 min-w-44 max-w-64 text-left rounded-2xl px-3 py-2 hover:bg-surface transition-colors"
          >
            <MapPin size={18} style={{ color: 'var(--brand)' }} />
            <span className="min-w-0">
              <span className="block text-xs text-text-secondary">Enviar a</span>
              <span className="flex items-center gap-1 text-sm font-bold text-text-primary truncate">
                {defaultAddress?.line1 || 'Seleccionar ubicación'}
                <ChevronDown size={14} />
              </span>
            </span>
          </button>

          <form onSubmit={submitSearch} className="flex-1 max-w-2xl mx-auto">
            <div className="bg-surface rounded-full px-5 py-3 flex items-center gap-3 border border-transparent focus-within:border-brand">
              <input
                aria-label="Buscar locales"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar locales, productos o categorías"
                className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
              />
              <button type="submit" aria-label="Buscar" className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--brand)' }}>
                <Search size={17} />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => routerNavigate('/cart')}
              aria-label="Carrito"
              className="relative w-11 h-11 rounded-2xl bg-surface flex items-center justify-center text-text-primary"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: '#FFD400', color: '#111827' }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button aria-label="Notificaciones" className="w-11 h-11 rounded-2xl bg-surface flex items-center justify-center text-text-primary">
              <Bell size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu((value) => !value)}
                className="flex items-center gap-2 rounded-2xl px-2 py-2 hover:bg-surface transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--brand)' }}>
                  {(user.full_name || 'C').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-text-primary max-w-28 truncate">{user.full_name || 'Cliente'}</span>
                <ChevronDown size={15} className="text-text-secondary" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-card rounded-2xl shadow-xl border border-border-light p-2">
                  {customerMenu.map(({ label, path, icon: Icon }) => {
                    const active = location.pathname === path;
                    return (
                      <button
                        key={path}
                        onClick={() => {
                          setShowMenu(false);
                          routerNavigate(path);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--brand-light)' : 'transparent',
                          color: active ? 'var(--brand)' : 'var(--text-primary)',
                        }}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    );
                  })}
                  <div className="h-px bg-border-light my-2" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium text-red-500 hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <LocationDialog
        open={showLocation}
        userId={user.id}
        onClose={() => setShowLocation(false)}
        onSaved={setAddresses}
      />
    </>
  );
}
