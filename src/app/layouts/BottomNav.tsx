import { Home, Search, ShoppingCart, Map, User, ClipboardList } from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useCart } from '../../modules/cart/context/CartContext';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  screen: string;
}

const itemsByRole: Record<string, NavItem[]> = {
  customer: [
    { id: 'home', label: 'Inicio', icon: Home, screen: 'home' },
    { id: 'search', label: 'Explorar', icon: Search, screen: 'home' },
    { id: 'tracking', label: 'Pedidos', icon: Map, screen: 'tracking' },
    { id: 'cart', label: 'Carrito', icon: ShoppingCart, screen: 'cart' },
    { id: 'profile', label: 'Perfil', icon: User, screen: 'home' },
  ],
  driver: [
    { id: 'driver', label: 'Inicio', icon: Home, screen: 'driver' },
    { id: 'orders', label: 'Órdenes', icon: ClipboardList, screen: 'driver' },
    { id: 'tracking', label: 'Ruta', icon: Map, screen: 'tracking' },
    { id: 'wallet', label: 'Ganancias', icon: ShoppingCart, screen: 'driver' },
    { id: 'profile', label: 'Perfil', icon: User, screen: 'driver' },
  ],
  store: [
    { id: 'store-admin', label: 'Inicio', icon: Home, screen: 'store-admin' },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, screen: 'store-admin' },
    { id: 'catalog', label: 'Catálogo', icon: Search, screen: 'store-admin' },
    { id: 'settings', label: 'Ajustes', icon: User, screen: 'store-admin' },
  ],
  admin: [
    { id: 'admin', label: 'Dashboard', icon: Home, screen: 'admin' },
    { id: 'users', label: 'Usuarios', icon: User, screen: 'admin' },
    { id: 'map', label: 'Mapa', icon: Map, screen: 'admin' },
    { id: 'settings', label: 'Config', icon: ShoppingCart, screen: 'admin' },
  ],
};

export function BottomNav() {
  const { navigate, user, screen } = useAuth();
  const { cartCount } = useCart();

  if (!user) return null;

  const items = itemsByRole[user.role] || itemsByRole.customer;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border-light flex items-center justify-around px-2 py-2 z-50 lg:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = screen === item.screen || (item.id === 'search' && screen === 'home');
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screen as any)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
          >
            <div className="relative">
              <Icon
                size={21}
                style={{ color: isActive ? 'var(--brand)' : '#9CA3AF' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {item.id === 'cart' && cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--brand)' : '#9CA3AF' }}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: 'var(--brand)' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
