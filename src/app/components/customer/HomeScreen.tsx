import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, ShoppingCart, Search, ChevronRight, LocateFixed,
  Truck, Flame, ChevronDown, Zap, Filter, TrendingUp, Clock, Store, Plus, Map,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { getStores, getStoresInBounds, getCategories, getProductsByStore } from '../../../modules/stores/application/store-service';
import { getMyOrders } from '../../../modules/orders/application/order-service';
import { getAddresses } from '../../../modules/client/application/client-service';
import { STATUS_LABELS, STATUS_ICONS } from '../../../modules/orders/domain/order-status.machine';
import { detectCityCached } from '../../../shared/lib/city';
import type { Address, Database } from '../../../shared/types';
import { ADDRESS_UPDATED_EVENT, LocationDialog } from './LocationDialog';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Store = Database['public']['Tables']['stores']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type StoreSummary = { name?: string | null; emoji?: string | null };
type CustomerOrder = {
  id: string;
  status: string;
  created_at: string;
  total?: number | null;
  order_items?: unknown[] | null;
  store?: StoreSummary | null;
};

const banners = [
  { id: '1', title: '¡Envío GRATIS!', sub: 'En tu primer pedido · Código RAYO15', bg: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)', text: '#4C1D95' },
  { id: '2', title: '20% OFF Restaurantes', sub: 'Solo hoy hasta las 22:00', bg: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)', text: '#FFFFFF' },
  { id: '3', title: 'Súper Express 24h', sub: 'Entrega en 15 minutos', bg: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)', text: '#FFD400' },
];

const inactiveOrderStatuses = ['delivered', 'cancelled', 'refunded'];

function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: { northEast: [number, number], southWest: [number, number] }) => void }) {
  const map = useMap();
  useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onBoundsChange({
        northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
        southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      });
    },
  });
  return null;
}

export function HomeScreen() {
  const { navigate, user } = useAuth();
  const { cartCount } = useCart();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStoreMap, setCategoryStoreMap] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [userAddress, setUserAddress] = useState('Av. Amazonas, Quito');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [manualCity, setManualCity] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapStores, setMapStores] = useState<Store[]>([]);

  const handleBoundsChange = async (bounds: { northEast: [number, number], southWest: [number, number] }) => {
    try {
      const storesInBounds = await getStoresInBounds(bounds.northEast, bounds.southWest);
      setMapStores(storesInBounds);
    } catch { /* noop */ }
  };

  useEffect(() => {
    const interval = setInterval(() => setActiveBanner((prev) => (prev + 1) % banners.length), 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
    loadActiveOrder();
    loadAddress();
  }, [user?.id]);

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const refreshAddress = (event: Event) => {
      const custom = event as CustomEvent<Address[]>;
      const selected = custom.detail?.find((address) => address.is_default) ?? custom.detail?.[0];
      if (selected?.line1) setUserAddress(selected.line1);
      if (!selected) void loadAddress();
    };
    window.addEventListener(ADDRESS_UPDATED_EVENT, refreshAddress);
    return () => window.removeEventListener(ADDRESS_UPDATED_EVENT, refreshAddress);
  }, [user?.id]);

  const detectUserCity = async () => {
    try {
      // Try from user's default address coordinates first
      const addresses = await getAddresses(user!.id).catch(() => [] as Address[]);
      const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0];
      if (defaultAddr?.lat && defaultAddr?.lng) {
        const city = await detectCityCached(defaultAddr.lat, defaultAddr.lng);
        if (city) { setUserCity(city); return; }
      }
      // Fallback: use GPS
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: false }),
        );
        const city = await detectCityCached(pos.coords.latitude, pos.coords.longitude);
        if (city) { setUserCity(city); return; }
      }
    } catch {
      // No GPS, no coords — user can pick manually
    }
    setUserCity(null);
  };

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (user && !manualCity) await detectUserCity();
      const activeCity = manualCity || userCity;
      const storesData = await getStores(activeCity || undefined);
      const [catsData] = await Promise.all([getCategories()]);
      setStores(storesData);
      setCategories(catsData);

      const map: Record<string, Set<string>> = {};
      for (const store of storesData) {
        try {
          const products = await getProductsByStore(store.id);
          for (const product of products) {
            if (product.category_id) {
              if (!map[product.category_id]) map[product.category_id] = new Set();
              map[product.category_id].add(store.id);
            }
          }
        } catch {
          // Some real stores may not have products yet.
        }
      }
      setCategoryStoreMap(map);
    } catch {
      setLoadError('No pudimos cargar la información. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const changeCity = (city: string) => {
    setManualCity(city);
    setUserCity(city);
    setShowCityPicker(false);
    void loadData();
  };

  const loadActiveOrder = async () => {
    if (!user) {
      setActiveOrder(null);
      setLoadingOrder(false);
      return;
    }
    setLoadingOrder(true);
    try {
      const orders = await getMyOrders(user.id) as CustomerOrder[];
      const active = orders.find((order) => !inactiveOrderStatuses.includes(order.status));
      setActiveOrder(active || null);
    } catch {
      setActiveOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const loadAddress = async () => {
    if (!user) return;
    try {
      const addresses = await getAddresses(user.id);
      const selected = addresses.find((address) => address.is_default) ?? addresses[0];
      if (selected?.line1) setUserAddress(selected.line1);
    } catch {
      // Address is optional for the home experience.
    }
  };

  const handleSelectStore = useCallback((id: string) => navigate('store-detail', { storeId: id }), [navigate]);

  const filteredStores = stores.filter((store) => {
    const matchSearch = store.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || (categoryStoreMap[activeCategory]?.has(store.id) ?? false);
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
      <div className="pt-10 pb-5 px-4 md:px-6 lg:hidden" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">⚡</div>
              <button className="flex items-center gap-1.5 text-white" onClick={() => setShowLocationDialog(true)}>
                <MapPin size={14} />
                <div className="text-left">
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Entregar en</p>
                  <p className="text-sm flex items-center gap-1">
                    {userCity || userAddress}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tiendas o productos..."
              className="flex-1 outline-none text-text-primary placeholder:text-text-secondary text-sm bg-transparent"
            />
            <button className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand)' }} aria-label="Filtrar">
              <Filter size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 lg:pt-8">
        <div className="hidden lg:block mb-6">
          <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>RayoExpress</p>
          <h1 className="text-3xl font-black text-text-primary">Todo cerca de ti</h1>
          <p className="text-text-secondary mt-1">
            Explora tiendas disponibles en <strong>{userCity || userAddress}</strong>.
          </p>
        </div>
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
                <span className="text-sm font-bold text-brand">{activeOrder.store?.name || 'Tienda'}</span>
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
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveBanner(index)}
                  className="rounded-full h-1.5 transition-all"
                  style={{
                    width: index === activeBanner ? 20 : 6,
                    backgroundColor: index === activeBanner ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
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
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <motion.div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: isActive ? 'var(--brand)' : (category.bg_color || '#F3F4F6'),
                        border: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="text-2xl md:text-3xl">{category.emoji || '📦'}</span>
                    </motion.div>
                    <span className="text-center text-[10px] md:text-xs" style={{ color: isActive ? 'var(--brand)' : '#6B7280' }}>
                      {category.name}
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">{filteredStores.length} tiendas</span>
              <button onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showMap ? 'text-white' : 'text-text-secondary bg-surface-hover'}`}
                style={showMap ? { backgroundColor: 'var(--brand)' } : {}}>
                <Map size={13} /> {showMap ? 'Lista' : 'Mapa'}
              </button>
            </div>
          </div>

          {showMap ? (
            <div className="rounded-2xl overflow-hidden border border-border-light z-0 mb-4" style={{ height: 380 }}>
              <MapContainer center={[-2.1706, -79.9223]} zoom={12} className="h-full w-full" scrollWheelZoom={true}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBoundsHandler onBoundsChange={handleBoundsChange} />
                {(mapStores.length > 0 ? mapStores : filteredStores).filter((s) => s.latitude && s.longitude).map((store) => (
                  <Marker key={store.id} position={[store.latitude!, store.longitude!]}>
                    <Popup>
                      <div className="text-center min-w-[120px]">
                        <p className="font-bold text-sm">{store.emoji} {store.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{store.description || ''}</p>
                        <button onClick={() => handleSelectStore(store.id)}
                          className="mt-2 px-3 py-1 rounded-lg text-white text-xs font-medium"
                          style={{ backgroundColor: 'var(--brand)' }}>
                          Ver tienda
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="py-10 text-center text-text-secondary">
              {search || activeCategory ? (
                <>
                  <span className="text-3xl mb-2 block">🔍</span>
                  <p>No encontramos resultados</p>
                  {activeCategory && (
                    <button onClick={() => setActiveCategory(null)} className="mt-3 text-sm font-medium" style={{ color: 'var(--brand)' }}>
                      Ver todas las tiendas
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Store size={40} className="mx-auto mb-2 text-text-secondary" />
                  <p className="font-medium text-text-primary">Sin tiendas en {userCity || 'tu ciudad'}</p>
                  <p className="text-sm mt-1">¿Eres dueño de un negocio? ¡Regístra tu tienda!</p>
                  <div className="flex gap-3 justify-center mt-4">
                    <button onClick={() => navigate('register-store')} className="px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--brand)' }}>
                      <Plus size={16} /> Registrar tienda
                    </button>
                    <button onClick={() => setShowCityPicker(true)} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border" style={{ color: 'var(--brand)' }}>
                      Cambiar ciudad
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStores.map((store, index) => (
                <motion.button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: store.cover_color ? `${store.cover_color}20` : '#F3F4F6', fontSize: 30 }}>
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

      {showCityPicker && (
        <div className="fixed inset-0 bg-black/45 flex items-end lg:items-center justify-center z-[80] p-4" onClick={() => setShowCityPicker(false)}>
          <div className="bg-card rounded-t-[28px] lg:rounded-3xl w-full lg:max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4 lg:hidden" />
            <h2 className="text-lg font-bold text-text-primary mb-1">Seleccionar ciudad</h2>
            <p className="text-sm text-text-secondary mb-4">Elige la ciudad donde quieres pedir.</p>
            <div className="space-y-2">
              {['El Coca', 'Francisco de Orellana', 'Quito', 'Guayaquil'].map((city) => (
                <button
                  key={city}
                  onClick={() => changeCity(city)}
                  className={`w-full rounded-2xl p-4 text-left flex items-center gap-3 ${(manualCity || userCity) === city ? 'bg-brand-light border border-brand' : 'bg-surface'}`}
                >
                  <MapPin size={18} style={{ color: (manualCity || userCity) === city ? 'var(--brand)' : '#9CA3AF' }} />
                  <span className="font-medium text-text-primary">{city}</span>
                  {(manualCity || userCity) === city && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-brand text-white">Actual</span>}
                </button>
              ))}
              <button onClick={() => { setShowCityPicker(false); setShowLocationDialog(true); }}
                className="w-full rounded-2xl p-4 bg-surface text-left flex items-center gap-3">
                <LocateFixed size={18} className="text-brand" />
                <span className="font-medium text-text-primary">Usar mi ubicación actual</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <LocationDialog
          open={showLocationDialog}
          userId={user.id}
          onClose={() => setShowLocationDialog(false)}
          onSaved={(addresses) => {
            const selected = addresses.find((address) => address.is_default) ?? addresses[0];
            if (selected?.line1) setUserAddress(selected.line1);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
