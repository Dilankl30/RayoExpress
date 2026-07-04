import { Home, Search, ShoppingCart, User, Map } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

interface BottomNavProps {
  active: string;
}

const items = [
  { id: 'home', label: 'Inicio', icon: Home, screen: 'home' as const },
  { id: 'search', label: 'Explorar', icon: Search, screen: 'home' as const },
  { id: 'tracking', label: 'Pedidos', icon: Map, screen: 'tracking' as const },
  { id: 'cart', label: 'Carrito', icon: ShoppingCart, screen: 'cart' as const },
  { id: 'profile', label: 'Perfil', icon: User, screen: 'home' as const },
];

export function BottomNav({ active }: BottomNavProps) {
  const { navigate } = useAuth();
  const { cartCount } = useCart();

  return (
    // Hidden on lg+ screens (desktop uses sidebar)
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50 max-w-md md:max-w-full mx-auto lg:hidden" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screen)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
          >
            <div className="relative">
              <Icon
                size={22}
                style={{ color: isActive ? '#6D28D9' : '#9CA3AF' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {item.id === 'cart' && cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: isActive ? '#6D28D9' : '#9CA3AF', fontSize: 10 }}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: '#6D28D9' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
