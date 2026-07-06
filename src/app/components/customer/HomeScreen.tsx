import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, ShoppingCart, Search, ChevronRight,
  Truck, Flame, ChevronDown, Zap, Filter, TrendingUp, Clock,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { getStores, getCategories, getProductsByStore } from '../../../modules/stores/application/store-service';
import { getMyOrders } from '../../../modules/orders/application/order-service';
import { STATUS_LABELS, STATUS_ICONS } from '../../../modules/orders/domain/order-status.machine';
import type { Database } from '../../../shared/types';

type Store = Database['public']['Tables']['stores']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

const banners = [
  { id: '1', title: '¡Envío GRATIS!', sub: 'En tu primer pedido · Código RAYO15', bg: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)', text: '#4C1D95' },
  { id: '2', title: '20% OFF Restaurantes', sub: 'Solo hoy hasta las 22:00', bg: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)', text: '#FFFFFF' },
  { id: '3', title: 'Súper Express 24h', sub: 'Entrega en 15 minutos', bg: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)', text: '#FFD400' },
];

export function HomeScreen() {
  const { navigate, user, navigationParams = {} } = useAuth();
  const { cartCount } = useCart();
  const [search, setSearch] = useState('');
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStoreMap, setCategoryStoreMap] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [userAddress, setUserAddress] = useState('Av. Amazonas, Quito');

  const defaultCategory = navigationParams.tab === 'super' ? 'cat-8' : null;

  useEffect(() => {
    const interval = setInterval(() => setActiveBanner((prev) => (prev + 1) % banners.length), 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
    loadActiveOrder();
    loadAddress();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [storesData, catsData] = await Promise.all([getStores(), getCategories()]);
      setStores(storesData);
      setCategories(catsData);
      const map: Record<string, Set<string>> = {};
      for (const store of storesData) {
        try {
          const products = await getProductsByStore(store.id);
          for (const p of products) {
            if (p.category_id) {
              if (!map[p.category_id]) map[p.category_id] = new Set();
              map[p.category_id].add(store.id);
            }
          }
        } catch { /* store sin productos */ }
      }
      setCategoryStoreMap(map);
      if (defaultCategory) setActiveCategory(defaultCategory);
    } catch {
      setLoadError('No pudimos cargar la información. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveOrder = async () => {
    if (!user) return;
    try {
      const orders = await getMyOrders(user.id);
      const active = orders.find((o: any) => !['delivered', 'cancelled', 'refunded'].includes(o.status));
      setActiveOrder(active || null);
    } catch { /* ignore */ } finally {
      setLoadingOrder(false);
    }
  };

  const loadAddress = () => {
    try {
      const saved = localStorage.getItem('rayoexpress-addresses');
      if (saved) {
        const addrs = JSON.parse(saved);
        if (addrs.length > 0) setUserAddress(addrs[0].line1);
      }
    } catch { /* ignore */ }
  };

  const handleSelectStore = useCallback((id: string) => navigate('store-detail', { storeId: id }), [navigate]);

  const filteredStores = stores.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || (categoryStoreMap[activeCategory]?.has(s.id) ?? true);
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Cargando tiendas...</p>
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
          <button onClick={loadData} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4 md:px-6 lg:px-8" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">⚡</div>
              <button className="flex items-center gap-1.5 text-white">
                <MapPin size={14} />
                <div className="text-left">
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Entregar en</p>
                  <p className="text-sm flex items-center gap-1">
                    {userAddress}
                    <ChevronDown size={13} />
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
                <ShoppingCart size={22} className="text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl flex items-center gap-2 px-4 py-3">
            <Search size={17} className="text-text-secondary flex-shrink-0" />
            <input
              aria-label="Buscar tiendas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tiendas o productos..."
              className="flex-1 outline-none text-text-primary placeholder:text-text-secondary text-sm bg-transparent"
            />
            <button className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand)' }} aria-label="Filtrar">
              <Filter size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {activeOrder && !loadingOrder && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-card rounded-2xl p-4 shadow-sm border border-brand-light cursor-pointer"
            onClick={() => navigate('tracking')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EDE9FE', fontSize: 20 }}>
                {STATUS_ICONS[activeOrder.status as keyof typeof STATUS_ICONS] || '📦'}
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-medium text-sm">Pedido en curso</p>
                <p className="text-xs text-text-secondary">{STATUS_LABELS[activeOrder.status as keyof typeof STATUS_LABELS] || activeOrder.status}</p>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-brand" />
                <span className="text-sm font-bold text-brand">{(activeOrder.store as any)?.name || 'Tienda'}</span>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </div>
          </motion.div>
        )}

        {!loadingOrder && !activeOrder && (
          <div className="mt-4 rounded-2xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)' }}>
            <div>
              <div className="flex items-center gap-1.5">
                <Zap size={16} fill="#4C1D95" style={{ color: '#4C1D95' }} />
                <p className="font-bold text-text-primary">Rayo Pass</p>
              </div>
              <p className="text-sm text-text-primary mt-0.5">Envíos ilimitados todo el mes</p>
            </div>
            <button className="bg-card px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0" style={{ color: 'var(--brand)' }}>
              $4.99/mes
            </button>
          </div>
        )}

        <div className="mt-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 120 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBanner}
                className="absolute inset-0 flex flex-col justify-center px-5"
                style={{ background: banners[activeBanner].bg }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-bold mb-1" style={{ color: banners[activeBanner].text, fontSize: 17 }}>
                  {banners[activeBanner].title}
                </p>
                <p className="text-sm opacity-80" style={{ color: banners[activeBanner].text }}>
                  {banners[activeBanner].sub}
                </p>
                <div className="mt-2">
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: banners[activeBanner].text }}>
                    Aprovechar →
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-2.5 right-4 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBanner(i)}
                  className="rounded-full h-1.5 transition-all"
                  style={{
                    width: i === activeBanner ? 20 : 6,
                    backgroundColor: i === activeBanner ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-text-primary font-semibold">Categorías</h3>
              <button className="text-sm flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                Ver todo <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? null : cat.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <motion.div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: isActive ? 'var(--brand)' : (cat.bg_color || '#F3F4F6'),
                        border: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="text-2xl md:text-3xl">{cat.emoji || '📦'}</span>
                    </motion.div>
                    <span className="text-center text-[10px] md:text-xs" style={{ color: isActive ? 'var(--brand)' : '#6B7280' }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-primary font-semibold flex items-center gap-2">
              {search ? (
                <><Search size={16} className="text-text-secondary" />Resultados</>
              ) : (
                <><Flame size={16} style={{ color: '#FF4500' }} />Populares ahora</>
              )}
            </h3>
            <span className="text-xs text-text-secondary">{filteredStores.length} tiendas</span>
          </div>

          {filteredStores.length === 0 ? (
            <div className="py-10 text-center text-text-secondary">
              <span className="text-3xl mb-2 block">🔍</span>
              <p>No encontramos resultados</p>
              {activeCategory && (
                <button onClick={() => setActiveCategory(null)} className="mt-3 text-sm font-medium" style={{ color: 'var(--brand)' }}>
                  Ver todas las tiendas
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStores.map((store, i) => (
                <motion.button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: store.cover_color ? store.cover_color + '20' : '#F3F4F6', fontSize: 30 }}>
                    {store.emoji || '🏪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">{store.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{store.description || ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {store.delivery_fee !== undefined && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: store.delivery_fee === 0 ? 'var(--success)' : '#6B7280' }}>
                          <Truck size={11} />
                          {store.delivery_fee === 0 ? 'Gratis' : `$${store.delivery_fee.toFixed(2)}`}
                        </span>
                      )}
                      {store.min_order > 0 && (
                        <span className="text-xs text-text-secondary">Mín ${store.min_order.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-secondary flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
            <h3 className="text-text-primary font-semibold">Tendencias</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['Sushi 🍱', 'Smoothies 🥤', 'Tacos 🌮', 'Helados 🍦', 'Pizzas 🍕', 'Burgers 🍔'].map((item) => (
              <button key={item} className="bg-card px-4 py-2 rounded-full text-sm text-text-primary flex-shrink-0 shadow-sm border border-border-light">
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
