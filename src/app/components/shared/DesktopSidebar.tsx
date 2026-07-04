import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import logo from '../../../imports/image-1.png';

const navByRole: Record<string, Array<{ id: string; label: string; icon: string }>> = {
  customer: [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'cart', label: 'Carrito', icon: '🛒' },
    { id: 'tracking', label: 'Pedidos', icon: '📦' },
  ],
  driver: [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'orders', label: 'Pedidos', icon: '📋' },
    { id: 'wallet', label: 'Ganancias', icon: '💰' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ],
  store: [
    { id: 'dashboard', label: 'Resumen', icon: '📊' },
    { id: 'orders', label: 'Pedidos', icon: '📋' },
    { id: 'catalog', label: 'Catálogo', icon: '📦' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { id: 'map', label: 'Mapa', icon: '🗺️' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ],
};

export function DesktopSidebar() {
  const { user, navigate, logout } = useAuth();
  const { cartCount } = useCart();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role] || navByRole.customer;

  return (
    <>
      {/* Overlay for mobile when sidebar would be visible - hidden by default on mobile */}
      <div className="hidden lg:block">
        <aside
          className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 flex flex-col ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-20 border-b border-gray-100 flex-shrink-0">
            <img src={logo} alt="Rayo" className="w-10 h-10 object-contain rounded-xl" />
            {!collapsed && (
              <div>
                <p className="font-bold text-gray-900 text-sm">RayoExpress</p>
                <p className="text-xs text-gray-400">{user.full_name || user.role}</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id as any)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all hover:bg-purple-50 text-gray-700 hover:text-purple-700"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                {item.id === 'cart' && cartCount > 0 && (
                  <span className="ml-auto bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="border-t border-gray-100 p-3 flex-shrink-0">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all"
            >
              <span className="text-xl flex-shrink-0">🚪</span>
              {!collapsed && <span className="font-medium">Cerrar sesión</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center mt-1 py-2 text-gray-400 hover:text-gray-600 transition-all"
            >
              <span className="text-sm">{collapsed ? '→' : '←'}</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
