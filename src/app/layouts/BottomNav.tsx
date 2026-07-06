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
    { id: 'super', label: 'Súper', icon: ShoppingBasket, screen: 'super' },
    { id: 'promotions', label: 'Promos', icon: Percent, screen: 'promotions' },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, screen: 'orders' },
    { id: 'profile', label: 'Mi perfil', icon: User, screen: 'profile' },
  ],
};

export function BottomNav() {
  const { navigate, user, screen } = useAuth();
  const { cartCount } = useCart();

  if (!user) return null;

  const items = itemsByRole[user.role] || itemsByRole.customer;

  const isActiveTab = (item: NavItem) => {
    if (item.id === 'super') return screen === 'super' || screen === 'store-detail';
    if (item.id === 'home') return screen === 'home' || screen === 'cart' || screen === 'tracking';
    if (item.id === 'profile') return screen === 'profile' || screen === 'personal-info' || screen === 'addresses' || screen === 'favorites' || screen === 'notification-settings' || screen === 'wallet';
    return screen === item.screen;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border-light flex items-center justify-around px-2 py-2 z-50 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveTab(item);
        return (
          <button
            key={item.id}
            onClick={() => {
              navigate(item.screen as any);
            }}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
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
