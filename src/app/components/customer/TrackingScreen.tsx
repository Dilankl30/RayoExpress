import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle, Clock, MessageCircle, Star, Locate, Navigation, Home, ZoomIn, ZoomOut } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { OrderChat } from '../../../modules/chat/ui/OrderChat';
import { getSupabase } from '../../../integrations/supabase/client';
import { getLatestOrderLocation, type DriverLocation } from '../../../modules/delivery/application/driver.service';
import { getMyOrders } from '../../../modules/orders/application/order-service';
import { ORDER_FLOW, STATUS_LABELS, STATUS_ICONS, getStepIndex } from '../../../modules/orders/domain/order-status.machine';
import type { OrderStatus } from '../../../modules/orders/domain/order-status.machine';
import type { Database } from '../../../shared/types';

// Fix Leaflet default marker icon paths for Vite/webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items?: Array<{ product_name?: string; quantity?: number; unit_price?: number }>;
  store?: { name?: string; emoji?: string; lat?: number; lng?: number };
};

const ORDER_HISTORY_KEY = 'rayoexpress-orders';
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded'];

// Mock coordinates for demo when real coords are missing
const MOCK_STORE_COORDS: [number, number] = [-0.4632, -76.9892]; // El Coca
const MOCK_DEST_COORDS: [number, number] = [-0.4660, -76.9870];

function loadOrderHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveOrderHistory(orderId: string) {
  try {
    const existing = loadOrderHistory();
    if (!existing.includes(orderId)) {
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify([orderId, ...existing].slice(0, 10)));
    }
  } catch { /* noop */ }
}

function estimateEta(status: OrderStatus) {
  if (status === 'pending' || status === 'accepted') return 35;
  if (status === 'preparing') return 25;
  if (status === 'picked_up') return 18;
  if (status === 'on_the_way') return 12;
  if (status === 'arrived') return 3;
  return 0;
}

function chooseActiveOrder(orders: Order[]) {
  return orders.find((order) => !TERMINAL_STATUSES.includes(order.status)) ?? orders[0] ?? null;
}

// ── Custom marker icons ──
const storeIcon = L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏪</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">📍</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});

const driverIcon = L.divIcon({
  className: '',
  html: `<div class="relative flex items-center justify-center" style="width:40px;height:40px;">
    <div class="radar-pulse-ring" style="background-color: rgba(109, 40, 217, 0.45);"></div>
    <div class="radar-pulse-ring-2" style="background-color: rgba(109, 40, 217, 0.25);"></div>
    <div style="position:relative;width:40px;height:40px;border-radius:50%;background:#6D28D9;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(109,40,217,0.5);font-size:18px;z-index:10;">🏍️</div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

// ── Map controller component ──
interface MapControllerProps {
  setMap: (map: L.Map) => void;
  storeCoords: [number, number];
  destCoords: [number, number];
  driverCoords: [number, number] | null;
  onUserDrag: () => void;
}

function MapController({ setMap, storeCoords, destCoords, driverCoords, onUserDrag }: MapControllerProps) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    setMap(map);
  }, [map, setMap]);

  useEffect(() => {
    if (hasFitted.current) return;
    const points: [number, number][] = [storeCoords, destCoords];
    if (driverCoords) points.push(driverCoords);
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    hasFitted.current = true;
  }, [map, storeCoords, destCoords, driverCoords]);

  useEffect(() => {
    map.on('dragstart', onUserDrag);
    map.on('zoomstart', onUserDrag);
    return () => {
      map.off('dragstart', onUserDrag);
      map.off('zoomstart', onUserDrag);
    };
  }, [map, onUserDrag]);

  return null;
}

export function TrackingScreen() {
  const { navigate, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [showChat, setShowChat] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const [followDriver, setFollowDriver] = useState(true);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  const activeOrder = useMemo(() => {
    if (activeOrderId) return orders.find((order) => order.id === activeOrderId) ?? null;
    return chooseActiveOrder(orders);
  }, [activeOrderId, orders]);

  const activeStatus = (activeOrder?.status ?? 'pending') as OrderStatus;
  const currentStep = getStepIndex(activeStatus);
  const currentStatusLabel = STATUS_LABELS[activeStatus] || 'Pendiente';
  const isDelivered = activeStatus === 'delivered';
  const eta = estimateEta(activeStatus);

  // Derive coordinates from order data or use mock
  const storeCoords: [number, number] = activeOrder?.store?.lat && activeOrder.store.lng
    ? [activeOrder.store.lat, activeOrder.store.lng]
    : MOCK_STORE_COORDS;
  const destCoords: [number, number] = (activeOrder as any)?.delivery_lat && (activeOrder as any)?.delivery_lng
    ? [(activeOrder as any).delivery_lat, (activeOrder as any).delivery_lng]
    : MOCK_DEST_COORDS;
  const driverCoords: [number, number] | null = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : null;

  const loadOrders = async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setLoadingOrders(true);
    try {
      const data = await getMyOrders(user.id);
      const normalized = (data ?? []) as Order[];
      setOrders(normalized);
      const selected = activeOrderId
        ? normalized.find((order) => order.id === activeOrderId) ?? chooseActiveOrder(normalized)
        : chooseActiveOrder(normalized);
      setActiveOrderId(selected?.id ?? null);
      if (selected) saveOrderHistory(selected.id);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadOrders(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => void loadOrders(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!activeOrder?.id || TERMINAL_STATUSES.includes(activeOrder.status)) {
      setDriverLocation(null);
      return;
    }
    const supabase = getSupabase();
    const channel = supabase
      .channel(`driver-location-${activeOrder.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations', filter: `order_id=eq.${activeOrder.id}` }, (payload) => {
        setDriverLocation(payload.new as DriverLocation);
      })
      .subscribe();
    void getLatestOrderLocation(activeOrder.id).then(setDriverLocation).catch(() => {});
    return () => { supabase.removeChannel(channel); };
  }, [activeOrder?.id, activeOrder?.status]);

  useEffect(() => {
    if (isDelivered) setShowRating(true);
  }, [isDelivered]);

  // Update driver marker position smoothly
  useEffect(() => {
    if (driverMarkerRef.current && driverCoords) {
      driverMarkerRef.current.setLatLng(driverCoords);
    }
  }, [driverCoords]);

  // Auto-follow driver when coordinates update
  useEffect(() => {
    if (followDriver && map && driverCoords) {
      map.panTo(driverCoords);
    }
  }, [driverCoords, followDriver, map]);

  // ── Order history view ──
  const orderHistory = (
    <div className="px-4 pt-4 pb-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('active')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'active' ? 'text-white' : 'bg-surface-hover text-text-secondary'}`}
          style={view === 'active' ? { backgroundColor: 'var(--brand)' } : {}}>Activo</button>
        <button onClick={() => setView('history')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'history' ? 'text-white' : 'bg-surface-hover text-text-secondary'}`}
          style={view === 'history' ? { backgroundColor: 'var(--brand)' } : {}}>Historial</button>
      </div>
      {loadingOrders ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <PackageEmpty />
          <p className="text-text-secondary mt-3">No tienes pedidos aun</p>
          <button onClick={() => navigate('home')} className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm" style={{ backgroundColor: 'var(--brand)' }}>Explorar tiendas</button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => { setActiveOrderId(order.id); setView('active'); }}
              className="w-full bg-card rounded-2xl p-4 shadow-sm border border-border-light text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-surface-hover flex items-center justify-center text-sm font-bold">{order.store?.emoji || 'RE'}</span>
                  <p className="font-medium text-text-primary text-sm truncate">{order.store?.name || 'Tienda'}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand font-medium">{STATUS_LABELS[order.status as OrderStatus] || order.status}</span>
              </div>
              <div className="space-y-1">{(order.order_items ?? []).slice(0, 3).map((item, i) => (<p key={i} className="text-xs text-text-secondary">{item.quantity}x {item.product_name}</p>))}</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                <p className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString('es-EC')}</p>
                <p className="font-bold text-sm" style={{ color: 'var(--brand)' }}>${Number(order.total ?? 0).toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (view === 'history') return orderHistory;

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-4 px-4 flex items-center justify-between" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('home')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <h3 className="text-white">Seguimiento</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{activeOrder ? `Pedido ${activeOrder.id.slice(0, 8)}` : 'Pedido en curso'}</p>
        </div>
        <button onClick={() => setView('history')} className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white">Historial</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* ── Real Map ── */}
        <div className="h-64 md:h-80 lg:h-96 relative z-0">
          <MapContainer center={storeCoords} zoom={14} className="h-full w-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapController
              setMap={setMap}
              storeCoords={storeCoords}
              destCoords={destCoords}
              driverCoords={driverCoords}
              onUserDrag={() => setFollowDriver(false)}
            />

            {/* Trazado de ruta dinámico */}
            {driverCoords ? (
              <>
                {/* Ruta Completada (Tienda -> Repartidor) - Morado Sólido */}
                <Polyline positions={[storeCoords, driverCoords]} color="#7C3AED" weight={5} opacity={0.8} />
                {/* Ruta Restante (Repartidor -> Cliente) - Morado Segmentado */}
                <Polyline positions={[driverCoords, destCoords]} color="#7C3AED" weight={4} opacity={0.6} dashArray="5, 10" />
              </>
            ) : (
              /* Ruta Estimada Completa (Tienda -> Cliente) - Gris Segmentado */
              <Polyline positions={[storeCoords, destCoords]} color="#9CA3AF" weight={4} opacity={0.6} dashArray="5, 8" />
            )}

            <Marker position={storeCoords} icon={storeIcon}>
              <Popup>{activeOrder?.store?.name || 'Tienda'}</Popup>
            </Marker>

            <Marker position={destCoords} icon={destIcon}>
              <Popup>Tu destino</Popup>
            </Marker>

            {driverCoords && (
              <Marker ref={driverMarkerRef} position={driverCoords} icon={driverIcon}>
                <Popup>Repartidor RayoExpress</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Botones de navegación y controles flotantes interactivos */}
          <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-border-light/40">
            {/* Botón Zoom In */}
            <button
              onClick={() => map?.zoomIn()}
              className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-primary hover:bg-surface-hover active:scale-95 transition-transform"
              title="Acercar"
              aria-label="Acercar mapa"
            >
              <ZoomIn size={16} />
            </button>
            {/* Botón Zoom Out */}
            <button
              onClick={() => map?.zoomOut()}
              className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-primary hover:bg-surface-hover active:scale-95 transition-transform"
              title="Alejar"
              aria-label="Alejar mapa"
            >
              <ZoomOut size={16} />
            </button>
            
            <div className="h-[1px] bg-border-light my-0.5" />

            {/* Ajustar vista completa */}
            <button
              onClick={() => {
                if (!map) return;
                const points: L.LatLngExpression[] = [storeCoords, destCoords];
                if (driverCoords) points.push(driverCoords);
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
              }}
              className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-primary hover:bg-surface-hover active:scale-95 transition-transform"
              title="Ajustar vista"
              aria-label="Ajustar vista"
            >
              <Locate size={16} />
            </button>

            {/* Centrar en Repartidor */}
            {driverCoords && (
              <button
                onClick={() => {
                  setFollowDriver(true);
                  map?.panTo(driverCoords);
                }}
                className={`w-9 h-9 rounded-xl shadow-sm flex items-center justify-center active:scale-95 transition-all ${
                  followDriver
                    ? 'bg-purple-600 text-white shadow-purple-200'
                    : 'bg-white text-text-primary hover:bg-surface-hover'
                }`}
                title="Seguir repartidor"
                aria-label="Seguir repartidor"
              >
                <Navigation size={16} className={followDriver ? 'animate-pulse' : ''} />
              </button>
            )}

            {/* Centrar en mi Destino */}
            <button
              onClick={() => {
                setFollowDriver(false);
                map?.panTo(destCoords);
              }}
              className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-primary hover:bg-surface-hover active:scale-95 transition-transform"
              title="Centrar mi ubicación"
              aria-label="Centrar mi ubicación"
            >
              <Home size={16} />
            </button>
          </div>

          {!isDelivered && (
            <div className="absolute top-3 left-3 z-[1000] bg-card rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2 border border-border-light/50">
              <Clock size={15} style={{ color: 'var(--brand)' }} />
              <div>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>Estimado</p>
                <p className="font-bold" style={{ color: 'var(--brand)', fontSize: 16 }}>{eta} min</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="lg:flex lg:gap-4 lg:mt-4">
            <div className="bg-card px-4 py-4 shadow-sm lg:rounded-2xl lg:flex-1">
              <div className="flex items-center gap-3">
                <motion.div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isDelivered ? '#F0FDF4' : '#EDE9FE', fontSize: 22 }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: isDelivered ? 0 : Infinity, duration: 1.5 }}>
                  {STATUS_ICONS[activeStatus] || '...'}
                </motion.div>
                <div className="flex-1">
                  <p className="text-text-primary font-medium">{currentStatusLabel}</p>
                  <p className="text-sm text-text-secondary">
                    {driverLocation
                      ? `Ultima ubicacion ${new Date(driverLocation.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
                      : activeOrder ? 'Esperando ubicacion del repartidor' : 'No hay un pedido activo para seguir'}
                  </p>
                </div>
                {isDelivered && <CheckCircle size={22} style={{ color: 'var(--success)' }} />}
              </div>
              <div className="flex items-center gap-1 mt-4">
                {ORDER_FLOW.map((_, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500"
                    style={{ backgroundColor: i <= currentStep ? 'var(--brand)' : '#E5E7EB' }} />
                ))}
              </div>
            </div>

            {activeOrder && (
              <div className="mx-4 lg:mx-0 mt-4 lg:mt-0 bg-card rounded-2xl p-4 shadow-sm lg:w-80">
                <p className="text-text-primary font-medium text-sm mb-3">Tu pedido</p>
                <div className="space-y-2">
                  {(activeOrder.order_items ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{item.quantity}x {item.product_name}</span>
                      <span className="text-text-primary">${Number(item.unit_price ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-surface-hover my-1" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span style={{ color: 'var(--brand)' }}>${Number(activeOrder.total ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeOrder && !isDelivered && (
            <div className="mx-4 mt-3">
              <button onClick={() => setShowChat(true)} className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--brand)' }}>
                <MessageCircle size={16} /> Chat del pedido
              </button>
            </div>
          )}

          {showRating && activeOrder && (
            <motion.div className="mx-4 mt-4 rounded-2xl p-5 text-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}>
              <p className="text-white font-bold mb-1">Pedido entregado</p>
              <p className="text-white/70 text-sm mb-4">Califica tu experiencia con RayoExpress.</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} aria-label={`${s} estrella${s !== 1 ? 's' : ''}`}>
                    <Star size={28} fill={s <= rating ? '#FFD400' : 'none'} stroke={s <= rating ? '#FFD400' : 'rgba(255,255,255,0.5)'} />
                  </button>
                ))}
              </div>
              <button className="px-8 py-2.5 rounded-2xl text-sm font-semibold" style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
                onClick={() => {
                  if (rating > 0) {
                    try {
                      const key = 'rayoexpress-ratings';
                      const existing = JSON.parse(localStorage.getItem(key) || '{}');
                      existing[activeOrder.id] = { rating, date: new Date().toISOString() };
                      localStorage.setItem(key, JSON.stringify(existing));
                    } catch { /* noop */ }
                  }
                  navigate('home');
                }}>
                Enviar calificacion
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {showChat && activeOrder && (
        <OrderChat orderId={activeOrder.id} storeId={activeOrder.store_id || 'store-1'} storeName={activeOrder.store?.name || 'Tienda'} storeEmoji={activeOrder.store?.emoji || 'RE'} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}

function PackageEmpty() {
  return (
    <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-hover flex items-center justify-center">
      <span className="text-2xl font-bold text-text-secondary">0</span>
    </div>
  );
}
