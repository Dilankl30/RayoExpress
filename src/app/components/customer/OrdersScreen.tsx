import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Filter, Headphones, ShoppingCart, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getMyOrders } from '../../../modules/orders/application/order-service';
import { STATUS_LABELS, STATUS_ICONS } from '../../../modules/orders/domain/order-status.machine';
import type { OrderStatus } from '../../../shared/types';

type StoreSummary = { name?: string | null; emoji?: string | null };
type CustomerOrder = {
  id: string;
  status: string;
  created_at: string;
  total?: number | null;
  order_items?: unknown[] | null;
  store?: StoreSummary | null;
};

const periodOptions = ['Última semana', 'Últimos 15 días', 'Últimos 30 días', 'Últimos 3 meses', 'Últimos 6 meses'];
const inactiveOrderStatuses = ['delivered', 'cancelled', 'refunded'];

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'Última semana': return new Date(now.getTime() - 7 * 86400000);
    case 'Últimos 15 días': return new Date(now.getTime() - 15 * 86400000);
    case 'Últimos 30 días': return new Date(now.getTime() - 30 * 86400000);
    case 'Últimos 3 meses': return new Date(now.getTime() - 90 * 86400000);
    case 'Últimos 6 meses': return new Date(now.getTime() - 180 * 86400000);
    default: return new Date(0);
  }
}

export function OrdersScreen() {
  const { navigate, user } = useAuth();
  const { cartCount } = useCart();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [status, setStatus] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [period, setPeriod] = useState(periodOptions[2]);
  const [showFilters, setShowFilters] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getMyOrders(user.id) as CustomerOrder[];
      setOrders(data || []);
    } catch {
      setLoadError('No pudimos cargar tus pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((order) => !inactiveOrderStatuses.includes(order.status));
  const periodDate = getPeriodDate(period);

  const filteredHistory = orders.filter((order) => {
    if (tab === 'active') return activeOrders.includes(order);
    const matchStatus = status === 'all' || order.status === status;
    const matchPeriod = new Date(order.created_at) >= periodDate;
    return matchStatus && matchPeriod;
  });

  const visible = tab === 'active' ? activeOrders : filteredHistory;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleHelp = (_orderId: string) => {
    navigate('tracking');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <span className="text-4xl mb-3 block">😕</span>
          <p className="text-text-primary font-bold mb-1">Error</p>
          <p className="text-sm text-text-secondary mb-4">{loadError}</p>
          <button onClick={loadOrders} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-16 lg:pb-0">
      <div className="pt-10 pb-4 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Mis Pedidos</h2>
          <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
            <ShoppingCart size={22} className="text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'active' ? 'text-white' : 'text-white/60 bg-white/10'}`}
            style={tab === 'active' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
          >
            En curso {activeOrders.length > 0 && `(${activeOrders.length})`}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'history' ? 'text-white' : 'text-white/60 bg-white/10'}`}
            style={tab === 'history' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
          >
            Historial
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === 'history' && (
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card text-text-secondary text-sm border border-border-light">
              <Filter size={15} /> Filtros
            </button>
            {(['all', 'delivered', 'cancelled'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setStatus(option)}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${status === option ? 'text-white' : 'bg-card text-text-secondary border border-border-light'}`}
                style={status === option ? { backgroundColor: 'var(--brand)' } : {}}
              >
                {option === 'all' ? 'Todos' : option === 'delivered' ? 'Entregados' : 'Cancelados'}
              </button>
            ))}
            <button onClick={() => setShowFilters(true)} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-card text-text-secondary text-sm border border-border-light whitespace-nowrap">
              <CalendarDays size={14} /> {period.split(' ').slice(0, 2).join(' ')}
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <span className="text-4xl mb-3 block">{tab === 'active' ? '📦' : '📋'}</span>
            <p className="font-medium">{tab === 'active' ? 'No tienes pedidos en curso' : 'No encontramos pedidos'}</p>
            <p className="text-sm mt-1">
              {tab === 'active' ? 'Explora tiendas y haz tu primer pedido' : 'Prueba con otros filtros'}
            </p>
            <button
              onClick={() => navigate('home')}
              className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Explorar tiendas
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {visible.map((order, index) => {
              const store = order.store || {};
              const items = order.order_items || [];
              const statusLabel = STATUS_LABELS[order.status as OrderStatus] || order.status;
              const statusIcon = STATUS_ICONS[order.status as OrderStatus] || '📋';
              const isActive = !inactiveOrderStatuses.includes(order.status);

              return (
                <motion.div
                  key={order.id}
                  className="bg-card rounded-2xl p-4 shadow-sm"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => navigate('tracking')}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: '#F3F4F6' }}>
                        {store.emoji || '🍔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-text-primary font-medium truncate">{store.name || 'Tienda'}</p>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {formatDate(order.created_at)} · {items.length} producto{items.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: isActive ? '#EDE9FE' : status === 'cancelled' ? '#FEE2E2' : '#F0FDF4',
                              color: isActive ? 'var(--brand)' : status === 'cancelled' ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {statusIcon} {statusLabel}
                          </span>
                          <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>
                            ${(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-text-secondary mt-1" />
                    </div>
                  </button>

                  {isActive && (
                    <button
                      onClick={() => handleHelp(order.id)}
                      className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#F3F4F6', color: 'var(--brand)' }}
                    >
                      <Headphones size={15} /> Ayuda con este pedido
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setShowFilters(false)}>
          <div className="bg-card rounded-t-[28px] w-full p-6 pb-8 max-w-md mx-auto" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Filtrar pedidos</h2>
              <button
                onClick={() => { setStatus('all'); setPeriod(periodOptions[2]); }}
                className="text-sm font-medium"
                style={{ color: 'var(--brand)' }}
              >
                Limpiar
              </button>
            </div>
            <h3 className="text-text-primary font-semibold mb-3">Período</h3>
            <div className="space-y-1">
              {periodOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setPeriod(option)}
                  className="w-full py-3 px-3 rounded-xl flex items-center justify-between text-left text-sm"
                  style={{ backgroundColor: period === option ? 'var(--brand-light)' : 'transparent', color: period === option ? 'var(--brand)' : 'var(--text-primary)' }}
                >
                  <span>{option}</span>
                  {period === option && <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-white" /></span>}
                </button>
              ))}
            </div>
            <h3 className="text-text-primary font-semibold mt-5 mb-3">Estado</h3>
            <div className="space-y-1">
              {(['all', 'delivered', 'cancelled'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setStatus(option)}
                  className="w-full py-3 px-3 rounded-xl flex items-center justify-between text-left text-sm"
                  style={{ backgroundColor: status === option ? 'var(--brand-light)' : 'transparent', color: status === option ? 'var(--brand)' : 'var(--text-primary)' }}
                >
                  <span>{option === 'all' ? 'Todos' : option === 'delivered' ? 'Entregados' : 'Cancelados'}</span>
                  {status === option && <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-white" /></span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="w-full mt-6 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
