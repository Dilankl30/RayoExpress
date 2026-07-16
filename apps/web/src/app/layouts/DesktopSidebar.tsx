import { useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { Home, ShoppingCart, LayoutDashboard, UserCircle, MoonStar, SunMedium, LogOut } from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useCart } from '../../modules/cart/context/CartContext';
import { useTheme } from '../../shared/theme/ThemeContext';
import type { Role, Screen } from '../../shared/types';
import { screenPathMap } from '../router';

type SidebarItem = { id: Screen; label: string; icon: ReactNode };

const navByRole: Record<Role, SidebarItem[]> = {
  customer: [
    { id: 'home', label: 'Inicio', icon: <Home size={18} /> },
    { id: 'cart', label: 'Carrito', icon: <ShoppingCart size={18} /> },
    { id: 'orders', label: 'Pedidos', icon: <LayoutDashboard size={18} /> },
  ],
  driver: [
    { id: 'driver', label: 'Inicio', icon: <Home size={18} /> },
    { id: 'profile', label: 'Perfil', icon: <UserCircle size={18} /> },
  ],
  store: [
    { id: 'store-admin', label: 'Resumen', icon: <LayoutDashboard size={18} /> },
    { id: 'profile', label: 'Perfil', icon: <UserCircle size={18} /> },
  ],
  admin: [
    { id: 'admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'profile', label: 'Perfil', icon: <UserCircle size={18} /> },
  ],
};

export function DesktopSidebar() {
  const { user, logout, navigate } = useAuth();
  const { cartCount } = useCart();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  if (!user) return null;

  const navItems = navByRole[user.role] || navByRole.customer;
  const isActive = (id: Screen) => {
    const path = screenPathMap[id] || `/${id}`;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  const isCustomer = user.role === 'customer';

  if (isCustomer) return null;

  return (
    <div className="hidden lg:block fixed left-0 top-0 h-full z-30 border-r border-border w-64 bg-card">
      <div className="flex items-center gap-3 px-4 h-20 border-b border-border-light">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">
          R
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary text-sm truncate">RayoExpress</p>
          <p className="text-xs text-text-secondary truncate">{user.full_name || user.role}</p>
        </div>
      </div>

      <nav className="py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
              isActive(item.id)
                ? 'bg-brand-light text-brand font-semibold'
                : 'hover:bg-brand-light text-text-primary hover:text-brand'
            }`}
          >
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <span className="font-medium truncate">{item.label}</span>
            {item.id === 'cart' && cartCount > 0 && (
              <span className="ml-auto bg-yellow-400 text-text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-border-light p-3 flex-shrink-0 space-y-1 absolute bottom-0 left-0 right-0">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-primary hover:bg-brand-light transition-all"
        >
          <span className="text-xl flex-shrink-0">{theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}</span>
          <span className="font-medium">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-danger hover:bg-danger-light transition-all"
        >
          <span className="text-xl flex-shrink-0"><LogOut size={18} /></span>
          <span className="font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
