import { useState, useEffect } from 'react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { CatalogManager } from '../../../modules/stores/ui/CatalogManager';
import { StoreSettings } from '../../../modules/stores/ui/StoreSettings';
import { toggleStoreOpen } from '../../../modules/stores/application/store-settings.service';
import { getStoreByOwner, getStoreDashboardStats, getStoreRecentOrders } from '../../../modules/stores/application/store-analytics.service';
import type { OrderSummary } from '../../../modules/stores/application/store-analytics.service';
import { STATUS_LABELS, STATUS_ICONS } from '../../../modules/orders/domain/order-status.machine';
import type { OrderStatus } from '../../../modules/orders/domain/order-status.machine';
import { PaymentVerification } from '../../../modules/payments/ui/PaymentVerification';
import { FinancialReport } from '../../../modules/payments/ui/FinancialReport';

export function StoreDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'payments' | 'reports' | 'settings'>('dashboard');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Mi Tienda');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ salesToday: 0, activeOrders: 0, productCount: 0, rating: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user) throw new Error('Usuario no autenticado');
        const store = await getStoreByOwner(user.id);
        if (!store) throw new Error('No tienes una tienda registrada');
        setStoreId(store.id);
        setStoreName(store.name);
        setIsOpen(store.is_open);
        const s = await getStoreDashboardStats(store.id);
        setStats(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!storeId || activeTab !== 'orders') return;
    setOrdersLoading(true);
    getStoreRecentOrders(storeId).then(setRecentOrders).catch(() => {}).finally(() => setOrdersLoading(false));
  }, [storeId, activeTab]);

  const handleToggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (storeId) await toggleStoreOpen(storeId, next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center max-w-sm">
          <p style={{ fontSize: 40 }}>🏪</p>
          <p className="text-text-primary font-bold mt-3">Error</p>
          <p className="text-sm text-text-secondary mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel de tienda</p>
            <p className="text-white font-medium">{storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
              style={{ backgroundColor: isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
              onClick={handleToggleOpen}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isOpen ? '#22C55E' : '#EF4444' }} />
              <span style={{ color: isOpen ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>
                {isOpen ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'catalog', 'payments', 'reports', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'
            }`}
            style={activeTab === tab ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {tab === 'dashboard' ? '📊 Dashboard' : tab === 'orders' ? '📋 Pedidos' : tab === 'catalog' ? '📦 Catálogo' : tab === 'payments' ? '💳 Pagos' : tab === 'reports' ? '📈 Reportes' : '⚙️ Config'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ventas hoy', value: `$${stats.salesToday.toFixed(2)}`, icon: '💰' },
                { label: 'Pedidos activos', value: String(stats.activeOrders), icon: '⏳' },
                { label: 'Productos', value: String(stats.productCount), icon: '📦' },
                { label: 'Calificación', value: stats.rating > 0 ? `${stats.rating.toFixed(1)} ⭐` : '—', icon: '⭐' },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl p-4 shadow-sm">
                  <p style={{ fontSize: 20 }}>{s.icon}</p>
                  <p className="font-bold text-text-primary text-lg">{s.value}</p>
                  <p className="text-xs text-text-secondary">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-text-primary">Estado de la tienda</p>
                <button
                  onClick={handleToggleOpen}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${isOpen ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}
                >
                  {isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                </button>
              </div>
              <p className="text-xs text-text-secondary">Toca para cambiar el estado</p>
            </div>
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl text-red-500 font-medium border border-red-200 hover:bg-danger-light transition-colors text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-semibold">Pedidos recientes</h3>
              <button
                onClick={() => { if (storeId) { setOrdersLoading(true); getStoreRecentOrders(storeId).then(setRecentOrders).catch(() => {}).finally(() => setOrdersLoading(false)); } }}
                className="text-sm text-brand font-medium"
              >
                Recargar
              </button>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-text-primary font-medium">No hay pedidos recientes</p>
                <p className="text-sm text-text-secondary mt-1">Los pedidos aparecerán aquí cuando lleguen.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{STATUS_ICONS[order.status as OrderStatus] || '📋'}</span>
                      <div className="min-w-0">
                        <p className="text-text-primary font-medium truncate">{order.customer_name || 'Cliente'}</p>
                        <p className="text-xs text-text-secondary">{STATUS_LABELS[order.status as OrderStatus] || order.status}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-text-primary font-bold">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
