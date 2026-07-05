import { Home, ShoppingBasket, Percent, User, ClipboardList } from 'lucide-react';
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
    { id: 'super', label: 'Super', icon: ShoppingBasket, screen: 'home' },
    { id: 'promotions', label: 'Promos', icon: Percent, screen: 'promotions' },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, screen: 'orders' },
    { id: 'profile', label: 'Mi perfil', icon: User, screen: 'profile' },
  ],
  driver: [
    { id: 'driver', label: 'Inicio', icon: Home, screen: 'driver' },
    { id: 'orders', label: 'Ordenes', icon: ClipboardList, screen: 'driver' },
    { id: 'profile', label: 'Perfil', icon: User, screen: 'profile' },
  ],
  store: [
    { id: 'store-admin', label: 'Inicio', icon: Home, screen: 'store-admin' },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, screen: 'store-admin' },
    { id: 'catalog', label: 'Catalogo', icon: ShoppingBasket, screen: 'store-admin' },
    { id: 'settings', label: 'Ajustes', icon: User, screen: 'profile' },
  ],
  admin: [
    { id: 'admin', label: 'Dashboard', icon: Home, screen: 'admin' },
    { id: 'users', label: 'Usuarios', icon: User, screen: 'admin' },
    { id: 'settings', label: 'Config', icon: ClipboardList, screen: 'profile' },
  ],
};

export function BottomNav() {
  const { navigate, user, screen } = useAuth();
  const { cartCount } = useCart();

  if (!user) return null;

  const items = itemsByRole[user.role] || itemsByRole.customer;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50 lg:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = screen === item.screen || (item.id === 'super' && screen === 'store-detail');
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screen as any)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
          >
            <div className="relative">
              <Icon
                size={22}
                style={{ color: isActive ? '#12001f' : '#9CA3AF' }}
                strokeWidth={isActive ? 2.7 : 1.9}
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
            <span className="text-[10px] font-medium" style={{ color: isActive ? '#12001f' : '#6B7280' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
