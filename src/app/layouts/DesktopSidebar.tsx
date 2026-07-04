import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useCart } from '../../modules/cart/context/CartContext';
import logo from '../../imports/image-1.png';

const navByRole: Record<string, Array<{ id: string; label: string; icon: string }>> = {
  customer: [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'cart', label: 'Carrito', icon: '🛒' },
    { id: 'tracking', label: 'Pedidos', icon: '📦' },
  ],
  driver: [
    { id: 'driver', label: 'Inicio', icon: '🏠' },
    { id: 'tracking', label: 'Pedidos', icon: '📋' },
    { id: 'wallet', label: 'Ganancias', icon: '💰' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ],
  store: [
    { id: 'store-admin', label: 'Resumen', icon: '📊' },
    { id: 'orders', label: 'Pedidos', icon: '📋' },
    { id: 'catalog', label: 'Catálogo', icon: '📦' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ],
  admin: [
    { id: 'admin', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { id: 'map', label: 'Mapa', icon: '🗺️' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ],
};

interface Props {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function SidebarContent({
  user, screen, logout, cartCount,
  collapsed, showClose, onClose, onNavigate, onToggleCollapse,
}: {
  user: any; screen: string; logout: () => void; cartCount: number;
  collapsed: boolean; showClose: boolean; onClose: () => void; onNavigate: (id: string) => void; onToggleCollapse: () => void;
}) {
  const navItems = navByRole[user.role] || navByRole.customer;
  const isActive = (id: string) => screen === id;

  return (
    <div className={`h-full bg-card flex flex-col ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center gap-3 px-4 h-20 border-b border-border-light flex-shrink-0">
        <img src={logo} alt="Rayo" className="w-10 h-10 object-contain rounded-xl" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-primary text-sm truncate">RayoExpress</p>
            <p className="text-xs text-text-secondary truncate">{user.full_name || user.role}</p>
          </div>
        )}
        {showClose && (
          <button onClick={onClose} className="lg:hidden text-text-secondary hover:text-text-secondary ml-auto">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
              isActive(item.id)
                ? 'bg-brand-light text-brand font-semibold'
                : 'hover:bg-brand-light text-text-primary hover:text-brand'
            }`}
          >
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="font-medium truncate">{item.label}</span>}
            {item.id === 'cart' && cartCount > 0 && (
              <span className="ml-auto bg-yellow-400 text-text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-border-light p-3 flex-shrink-0 space-y-1">
        <button
          onClick={() => { logout(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-danger hover:bg-danger-light transition-all"
        >
          <span className="text-xl flex-shrink-0">🚪</span>
          {!collapsed && <span className="font-medium">Cerrar sesión</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center justify-center py-2 text-text-secondary hover:text-text-secondary transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </div>
  );
}

export function DesktopSidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: Props) {
  const { user, screen, logout, navigate } = useAuth();
  const { cartCount } = useCart();
  if (!user) return null;

  const onNavigate = (id: string) => {
    navigate(id as any);
    onMobileClose();
  };

  const commonProps = { user, screen, logout, cartCount, collapsed, onClose: onMobileClose, onNavigate, onToggleCollapse };

  return (
    <>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.div
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <SidebarContent {...commonProps} showClose={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-30 border-r border-border">
        <SidebarContent {...commonProps} showClose={false} />
      </div>
    </>
  );
}
