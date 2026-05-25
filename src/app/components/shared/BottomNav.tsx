import { Home, Search, ShoppingCart, User, Map } from 'lucide-react';
import type { Screen } from '../../types';

interface BottomNavProps {
  active: string;
  onNavigate: (screen: Screen) => void;
  cartCount?: number;
}

const items = [
  { id: 'home', label: 'Inicio', icon: Home, screen: 'home' as Screen },
  { id: 'search', label: 'Explorar', icon: Search, screen: 'home' as Screen },
  { id: 'tracking', label: 'Pedidos', icon: Map, screen: 'tracking' as Screen },
  { id: 'cart', label: 'Carrito', icon: ShoppingCart, screen: 'cart' as Screen },
  { id: 'profile', label: 'Perfil', icon: User, screen: 'home' as Screen },
];

export function BottomNav({ active, onNavigate, cartCount = 0 }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50 max-w-md lg:max-w-6xl mx-auto lg:hidden" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.screen)}
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
            <span
              className="text-xs"
              style={{ color: isActive ? '#6D28D9' : '#9CA3AF', fontSize: 10 }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ backgroundColor: '#6D28D9' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
