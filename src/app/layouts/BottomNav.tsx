import { useLocation, useNavigate } from 'react-router';
import { Home, User, ClipboardList, Compass, Heart } from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useCart } from '../../modules/cart/context/CartContext';
import { screenPathMap } from '../router';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  screen: string;
}

const itemsByRole: Record<string, NavItem[]> = {
  customer: [
    { id: 'home', label: 'Inicio', icon: Home, screen: 'home' },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, screen: 'orders' },
    { id: 'explore', label: 'Explorar', icon: Compass, screen: 'explore' },
    { id: 'favorites', label: 'Favoritos', icon: Heart, screen: 'favorites' },
    { id: 'profile', label: 'Perfil', icon: User, screen: 'profile' },
  ],
};

export function BottomNav() {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const routerNavigate = useNavigate();

  if (!user) return null;

  const items = itemsByRole[user.role] || itemsByRole.customer;

  const isActiveTab = (item: NavItem): boolean => {
    const path = location.pathname;
    switch (item.screen) {
      case 'home':
        return path === '/home' || path === '/cart' || path === '/tracking' || path.startsWith('/store-detail/');
      case 'orders':
        return path === '/orders';
      case 'explore':
        return path === '/explore';
      case 'favorites':
        return path === '/favorites';
      case 'profile':
        return path === '/profile' || path === '/personal-info' || path === '/addresses' || path === '/notification-settings' || path === '/wallet';
      default:
        return path === (screenPathMap[item.screen] || `/${item.screen}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border-light flex lg:hidden items-center justify-around px-2 py-2 z-50 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveTab(item);
        const path = screenPathMap[item.screen] || `/${item.screen}`;

        return (
          <button
            key={item.id}
            onClick={() => routerNavigate(path)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative">
              <Icon
                size={21}
                style={{ color: isActive ? 'var(--brand)' : '#9CA3AF' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {item.id === 'super' && cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: '#FFE943', color: '#111827', fontSize: 9 }}
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
