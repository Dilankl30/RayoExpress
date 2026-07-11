import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { CatalogManager } from '../../../modules/stores/ui/CatalogManager';
import { StoreSettings } from '../../../modules/stores/ui/StoreSettings';
import { toggleStoreOpen } from '../../../modules/stores/application/store-settings.service';
import { getStoreByOwner, getStoreDashboardStats } from '../../../modules/stores/application/store-analytics.service';
import { getStoreOrders, updateOrderStatus, getOrderById } from '../../../modules/orders/application/order-service';
import type { OrderSummary, StoreDashboardStats } from '../../../modules/stores/application/store-analytics.service';
import { STATUS_LABELS, STATUS_ICONS, getAvailableTransitions } from '../../../modules/orders/domain/order-status.machine';
import type { OrderStatus } from '../../../modules/orders/domain/order-status.machine';
import { PaymentVerification } from '../../../modules/payments/ui/PaymentVerification';
import { FinancialReport } from '../../../modules/payments/ui/FinancialReport';
import { Package, X, ChevronRight, RefreshCw } from 'lucide-react';

type Tab = 'dashboard' | 'orders' | 'catalog' | 'payments' | 'reports' | 'settings';
type OrderFilter = 'all' | 'active' | 'delivered' | 'cancelled';
type DashboardOrder = OrderSummary & { driver_name?: string | null };

const TAB_ICONS: Record<Tab, string> = { dashboard: '📊', orders: '📋', catalog: '📦', payments: '💳', reports: '📈', settings: '⚙️' };
const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived'];

const ACTION_LABELS: Record<string, string> = {
  accepted: 'Aceptar pedido', preparing: 'Comenzar preparación',
  picked_up: 'Marcar listo', delivered: 'Completado',
  cancelled: 'Cancelar pedido',
};

export function StoreDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab as Tab);
    }
  }, [location.state]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Mi Tienda');
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StoreDashboardStats>({ salesToday: 0, activeOrders: 0, productCount: 0, rating: 0 });
  const [allOrders, setAllOrders] = useState<DashboardOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('active');
  const [detailOrder, setDetailOrder] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load store info and stats
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        if (!user) throw new Error('Usuario no autenticado');
        const store = await getStoreByOwner(user.id);
        if (!store) throw new Error('No tienes una tienda registrada');
        setStoreId(store.id); setStoreName(store.name); setIsOpen(store.is_open);
        setStoreCity((store as any).city || null);
        setStats(await getStoreDashboardStats(store.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!storeId) return;
    setOrdersLoading(true);
    try {
      const data = await getStoreOrders(storeId);
      setAllOrders((data as any[]).map((o: any) => ({
        id: o.id, status: o.status, total: o.total ?? 0,
        customer_name: o.customer_name ?? null,
        driver_name: o.driver?.full_name ?? null,
        created_at: o.created_at,
      })));
    } catch { /* noop */ } finally { setOrdersLoading(false); }
  }, [storeId]);

  useEffect(() => { if (storeId && activeTab === 'orders') loadOrders(); }, [storeId, activeTab, loadOrders]);

  // Real-time subscription to orders table
  useEffect(() => {
    if (!storeId || activeTab !== 'orders') return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`store-orders-rt-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, (payload) => {
        loadOrders();
        // Play notification sound when a new order is received
        if (payload.eventType === 'INSERT') {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch { /* noop */ }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId, activeTab, loadOrders]);

  const handleToggleOpen = async () => {
    const next = !isOpen; setIsOpen(next);
    if (storeId) await toggleStoreOpen(storeId, next).catch(() => setIsOpen(!next));
  };

  const handleStatusAction = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, 'store', user?.id);
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setStats(prev => ({ ...prev, activeOrders: newStatus === 'cancelled' || newStatus === 'delivered' ? Math.max(0, prev.activeOrders - 1) : prev.activeOrders + 1 }));
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const full = await getOrderById(orderId);
      setDetailOrder(full as Record<string, unknown>);
    } catch { /* noop */ } finally { setDetailLoading(false); }
  };

  const filteredOrders = allOrders.filter(o => {
    if (orderFilter === 'active') return ACTIVE_STATUSES.includes(o.status);
    if (orderFilter === 'delivered') return o.status === 'delivered';
    if (orderFilter === 'cancelled') return ['cancelled', 'refunded'].includes(o.status);
    return true;
  });

  const ordersByStatus = (status: string) => allOrders.filter(o => o.status === status).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center max-w-sm">
        <p style={{ fontSize: 40 }}>🏪</p>
        <p className="text-text-primary font-bold mt-3">Error</p>
        <p className="text-sm text-text-secondary mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      {/* Header */}
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel de tienda</p>
            <p className="text-white font-medium">{storeName} {storeCity && <span className="text-white/60 text-xs ml-1">· {storeCity}</span>}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer" style={{ backgroundColor: isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }} onClick={handleToggleOpen}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isOpen ? '#22C55E' : '#EF4444' }} />
              <span style={{ color: isOpen ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'catalog', 'payments', 'reports', 'settings'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'}`}
            style={activeTab === tab ? { backgroundColor: 'var(--brand)' } : {}}>
            {TAB_ICONS[tab]} {tab === 'dashboard' ? 'Dashboard' : tab === 'orders' ? 'Pedidos' : tab === 'catalog' ? 'Catálogo' : tab === 'payments' ? 'Pagos' : tab === 'reports' ? 'Reportes' : 'Config'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Dashboard tab ── */}
        {activeTab === 'dashboard' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <span className="text-xl">💰</span>
                <p className="font-bold text-text-primary text-lg">${stats.salesToday.toFixed(2)}</p>
                <p className="text-xs text-text-secondary">Ventas hoy</p>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <span className="text-xl">⏳</span>
                <p className="font-bold text-text-primary text-lg">{stats.activeOrders}</p>
                <p className="text-xs text-text-secondary">Pedidos activos</p>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <span className="text-xl">📦</span>
                <p className="font-bold text-text-primary text-lg">{stats.productCount}</p>
                <p className="text-xs text-text-secondary">Productos</p>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <span className="text-xl">⭐</span>
                <p className="font-bold text-text-primary text-lg">{stats.rating > 0 ? stats.rating.toFixed(1) : '—'}</p>
                <p className="text-xs text-text-secondary">Calificación</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text-primary">Resumen de pedidos</p>
                <button onClick={() => setActiveTab('orders')} className="text-xs text-brand font-medium flex items-center gap-1">Ver todo <ChevronRight size={12} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Nuevos', count: ordersByStatus('pending'), color: '#F59E0B' },
                  { label: 'En curso', count: ordersByStatus('accepted') + ordersByStatus('preparing'), color: '#3B82F6' },
                  { label: 'En camino', count: ordersByStatus('picked_up') + ordersByStatus('on_the_way'), color: '#6D28D9' },
                  { label: 'Entregados', count: ordersByStatus('delivered'), color: '#22C55E' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-xs text-text-secondary">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-text-primary">Estado de la tienda</p>
                <button onClick={handleToggleOpen} className={`px-4 py-1.5 rounded-full text-xs font-medium ${isOpen ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>
                  {isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                </button>
              </div>
              <p className="text-xs text-text-secondary">Toca para cambiar el estado</p>
            </div>

            <button onClick={logout} className="w-full py-3 rounded-xl text-red-500 font-medium border border-red-200 hover:bg-danger-light transition-colors text-sm">Cerrar sesión</button>
          </div>
        )}

        {/* ── Orders tab ── */}
        {activeTab === 'orders' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-semibold">Pedidos</h3>
              <button onClick={loadOrders} className="flex items-center gap-1 text-sm text-brand font-medium">
                <RefreshCw size={14} /> Recargar
              </button>
            </div>

            {/* Status filter */}
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {(['active', 'delivered', 'cancelled', 'all'] as OrderFilter[]).map((f) => (
                <button key={f} onClick={() => setOrderFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${orderFilter === f ? 'text-white' : 'text-text-secondary bg-surface-hover'}`}
                  style={orderFilter === f ? { backgroundColor: 'var(--brand)' } : {}}>
                  {f === 'active' ? '🟡 Activos' : f === 'delivered' ? '✅ Entregados' : f === 'cancelled' ? '❌ Cancelados' : '📋 Todos'}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
                <span className="text-3xl mb-2 block">📋</span>
                <p className="text-text-primary font-medium">No hay pedidos {orderFilter !== 'all' ? 'en este estado' : ''}</p>
                <p className="text-sm text-text-secondary mt-1">Los pedidos aparecerán aquí cuando lleguen.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {filteredOrders.map((order) => {
                  const transitions = getAvailableTransitions(order.status as OrderStatus, 'store');
                  return (
                    <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{(STATUS_ICONS as Record<string, string>)[order.status] || '📋'}</span>
                          <div className="min-w-0">
                            <p className="text-text-primary font-medium truncate">{order.customer_name || 'Cliente'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                order.status === 'delivered' ? 'bg-success-light text-success' :
                                ['cancelled', 'refunded'].includes(order.status) ? 'bg-danger-light text-danger' :
                                'bg-warning-light text-warning'
                              }`}>{STATUS_LABELS[order.status as OrderStatus] || order.status}</span>
                              <span className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-text-primary font-bold">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      {order.driver_name && (
                        <div className="mt-1 mb-2 text-xs text-brand bg-purple-50 rounded-lg px-2.5 py-1 flex items-center gap-1.5 w-fit">
                          <span>🏍️</span>
                          <span>Repartidor: <strong className="font-semibold">{order.driver_name}</strong></span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {transitions.map((t) => {
                          const isCancel = t === 'cancelled';
                          const isAccept = t === 'accepted';
                          return (
                            <button key={t} onClick={() => handleStatusAction(order.id, t)} disabled={actionLoading === order.id}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${
                                isCancel ? 'text-danger border border-red-200' :
                                isAccept ? 'text-white' : 'text-text-secondary border border-border'
                              }`}
                              style={!isCancel ? { backgroundColor: isAccept ? 'var(--success)' : 'transparent' } : {}}>
                              {actionLoading === order.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                              {ACTION_LABELS[t] || t}
                            </button>
                          );
                        })}
                        <button onClick={() => openDetail(order.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-brand border border-brand/30">
                          <Package size={12} /> Detalle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalog' && storeId && <CatalogManager storeId={storeId} />}
        {activeTab === 'payments' && storeId && user && (
          <div className="px-4 pt-4">
            <h3 className="text-text-primary font-semibold mb-3">Verificación de pagos</h3>
            <PaymentVerification storeId={storeId} userId={user.id} />
          </div>
        )}
        {activeTab === 'reports' && storeId && (
          <div className="px-4 pt-4">
            <h3 className="text-text-primary font-semibold mb-3">Reporte financiero</h3>
            <FinancialReport storeId={storeId} />
          </div>
        )}
        {activeTab === 'settings' && storeId && <StoreSettings storeId={storeId} />}
      </div>

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center lg:p-4" onClick={() => setDetailOrder(null)}>
          <div className="bg-card rounded-t-[28px] lg:rounded-3xl w-full lg:max-w-lg max-h-[85vh] overflow-y-auto p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-primary">Detalle del pedido</h2>
              <button onClick={() => setDetailOrder(null)} className="text-text-secondary"><X size={20} /></button>
            </div>
            {detailLoading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface rounded-2xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Cliente</p>
                  <p className="font-medium text-text-primary">{detailOrder.customer_name as string || '—'}</p>
                </div>
                <div className="bg-surface rounded-2xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Estado</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    (detailOrder.status as string) === 'delivered' ? 'bg-success-light text-success' :
                    ['cancelled', 'refunded'].includes(detailOrder.status as string) ? 'bg-danger-light text-danger' :
                    'bg-warning-light text-warning'
                  }`}>{(STATUS_LABELS as Record<string, string>)[detailOrder.status as string] || detailOrder.status as string}</span>
                </div>
                {detailOrder.driver && (
                  <div className="bg-surface rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">
                      🏍️
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Repartidor asignado</p>
                      <p className="font-medium text-text-primary">{(detailOrder.driver as any).full_name}</p>
                    </div>
                  </div>
                )}
                <div className="bg-surface rounded-2xl p-4">
                  <p className="text-xs text-text-secondary mb-2">Productos</p>
                  {(detailOrder.order_items as Array<{ product_name?: string; quantity?: number; unit_price?: number }> || []).map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-sm border-b border-border-light last:border-0">
                      <span className="text-text-primary">{item.quantity}x {item.product_name || 'Producto'}</span>
                      <span className="text-text-secondary">${Number(item.unit_price ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface rounded-2xl p-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span style={{ color: 'var(--brand)' }}>${Number(detailOrder.total as number || 0).toFixed(2)}</span>
                  </div>
                </div>
                {detailOrder.delivery_address as string && (
                  <div className="bg-surface rounded-2xl p-4">
                    <p className="text-xs text-text-secondary mb-1">Dirección de entrega</p>
                    <p className="text-sm text-text-primary">{detailOrder.delivery_address as string}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
