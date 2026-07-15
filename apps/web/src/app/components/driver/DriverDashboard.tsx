import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import {
  Bike,
  Camera,
  ChevronRight,
  DollarSign,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  RefreshCw,
  Star,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { OrderChat } from '../../../modules/chat/ui/OrderChat';
import { getSupabase } from '../../../integrations/supabase/client';
import {
  claimDriverOrder,
  getAvailableDriverOrders,
  getDriverEarnings,
  getDriverOrdersToday,
  getDriverProfile,
  getDriverTripCount,
  getDriverWeeklyHistory,
  getDriverWorkOrders,
  saveDriverLocation,
  setDriverOnline,
  uploadDeliveryEvidence,
  type AvailableDriverOrder,
  type DriverLocation,
  type DriverWorkOrder,
} from '../../../modules/delivery/application/driver.service';
import { DeliveryEvidenceModal } from '../../../modules/delivery/ui/DeliveryEvidenceModal';
import { updateOrderStatus } from '../../../modules/orders/application/order-service';
import { STATUS_LABELS, type OrderStatus } from '../../../modules/orders/domain/order-status.machine';
import logo from '../../../imports/image-1.png';
import mascot from '../../../imports/image.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const storeIcon = L.divIcon({
  className: '',
  html: '<div style="width:32px;height:32px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:14px;">🏪</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:32px;height:32px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:14px;">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const driverIcon = L.divIcon({
  className: '',
  html: `<div class="relative flex items-center justify-center" style="width:36px;height:36px;">
    <div class="radar-pulse-ring" style="background-color: rgba(109, 40, 217, 0.45);"></div>
    <div class="radar-pulse-ring-2" style="background-color: rgba(109, 40, 217, 0.25);"></div>
    <div style="position:relative;width:36px;height:36px;border-radius:50%;background:#6D28D9;display:flex;align-items:center;justify-content:center;border:3.5px solid white;box-shadow:0 2px 10px rgba(109,40,217,0.45);font-size:16px;z-index:10;">🏍️</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function DriverMapController({ storeCoords, destCoords, currentCoords }: { storeCoords: [number, number], destCoords: [number, number], currentCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [storeCoords, destCoords];
    if (currentCoords) points.push(currentCoords);
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }, [map, storeCoords, destCoords, currentCoords]);
  return null;
}

type DriverTab = 'dashboard' | 'orders' | 'wallet' | 'profile';
type DriverLocationState = { tab?: DriverTab } | null;

const ACTIVE_DELIVERY_STATUSES = ['picked_up', 'on_the_way', 'arrived'];

function nextDriverStatus(status: string): { status: OrderStatus; label: string } | null {
  if (status === 'preparing') return { status: 'picked_up', label: 'Confirmar retiro' };
  if (status === 'picked_up') return { status: 'on_the_way', label: 'Iniciar ruta' };
  if (status === 'on_the_way') return { status: 'arrived', label: 'Llegue al destino' };
  if (status === 'arrived') return { status: 'delivered', label: 'Marcar entregado' };
  return null;
}

function isAssignableToDriver(status: string) {
  return ACTIVE_DELIVERY_STATUSES.includes(status);
}

export function DriverDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const locationState = location.state as DriverLocationState;
  const [activeTab, setActiveTab] = useState<DriverTab>('dashboard');
  
  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab);
    }
  }, [locationState?.tab]);

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState('');
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, balance: 0 });
  const [weeklyHistory, setWeeklyHistory] = useState<{ day: string; earnings: number; orders: number }[]>([]);
  const [todayOrders, setTodayOrders] = useState<{ id: string; store_name: string; store_emoji: string; total: number; status: string; created_at: string }[]>([]);
  const [workOrders, setWorkOrders] = useState<DriverWorkOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<AvailableDriverOrder[]>([]);
  const [tripCount, setTripCount] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatOrder, setChatOrder] = useState<DriverWorkOrder | null>(null);

  const activeOrder = useMemo(
    () => workOrders.find((order) => ACTIVE_DELIVERY_STATUSES.includes(order.status)) ?? workOrders[0] ?? null,
    [workOrders],
  );

  const maxEarnings = Math.max(...weeklyHistory.map((d) => d.earnings), 1);

  const loadDashboard = async (withSpinner = false) => {
    if (!user) return;
    if (withSpinner) setRefreshing(true);
    try {
      const [profile, earns, history, deliveredToday, trips, assigned, available] = await Promise.all([
        getDriverProfile(user.id),
        getDriverEarnings(user.id),
        getDriverWeeklyHistory(user.id),
        getDriverOrdersToday(user.id),
        getDriverTripCount(user.id),
        getDriverWorkOrders(user.id),
        getAvailableDriverOrders(),
      ]);
      if (profile) setIsOnline(profile.is_online);
      setDriverRating(profile?.rating ?? 0);
      setEarnings(earns);
      setWeeklyHistory(history);
      setTodayOrders(deliveredToday);
      setTripCount(trips);
      setWorkOrders(assigned);
      setAvailableOrders(available);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel('driver-orders-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void loadDashboard(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !isOnline || !activeOrder || !isAssignableToDriver(activeOrder.status)) return;
    if (!('geolocation' in navigator)) {
      setLocationError('Este navegador no permite compartir ubicacion.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationError('');
        const saved = await saveDriverLocation(user.id, activeOrder.id, lat, lng).catch(() => null);
        setDriverLocation(saved ?? { lat, lng, created_at: new Date().toISOString() });
      },
      () => setLocationError('Activa el permiso de ubicacion para que el cliente vea el avance.'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeOrder?.id, activeOrder?.status, isOnline, user]);

  const handleToggleOnline = async () => {
    if (!user) return;
    const next = !isOnline;
    setIsOnline(next);
    await setDriverOnline(user.id, next);
  };

  const handleStatusAction = async (order: DriverWorkOrder) => {
    if (!user) return;
    const action = nextDriverStatus(order.status);
    if (!action) return;
    setUpdatingStatus(order.id);
    try {
      await updateOrderStatus(order.id, action.status, 'driver', user.id);
      await loadDashboard(true);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleClaimOrder = async (order: AvailableDriverOrder) => {
    if (!user) return;
    setClaimingOrder(order.id);
    try {
      await claimDriverOrder(order.id, user.id);
      await loadDashboard(true);
      setActiveTab('orders');
    } finally {
      setClaimingOrder(null);
    }
  };

  const handleDeliveryEvidence = async (file: File, notes: string) => {
    if (!user || !activeOrder) return;
    await uploadDeliveryEvidence(activeOrder.id, user.id, file, notes);
    await updateOrderStatus(activeOrder.id, 'delivered', 'driver', user.id);
    setShowEvidence(false);
    await loadDashboard(true);
  };

  const openChat = (order: DriverWorkOrder) => {
    setChatOrder(order);
    setShowChat(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel de repartidor</p>
              <p className="text-white font-medium">{user?.full_name || 'Conductor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Actualizar"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
          <div>
            <p className="text-white font-medium">Estado de servicio</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {isOnline ? 'En linea y compartiendo ubicacion en pedidos activos' : 'Conectate para recibir y gestionar entregas'}
            </p>
          </div>
          <button onClick={handleToggleOnline} className="flex-shrink-0" aria-label="Cambiar estado">
            {isOnline ? <ToggleRight size={46} style={{ color: '#FFD400' }} /> : <ToggleLeft size={46} style={{ color: 'rgba(255,255,255,0.45)' }} />}
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto lg:justify-center" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'wallet', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              activeTab === tab ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'
            }`}
            style={activeTab === tab ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {tab === 'dashboard' ? 'Dashboard' : tab === 'orders' ? 'Pedidos' : tab === 'wallet' ? 'Cartera' : 'Perfil'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <>
              <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Ganancias hoy', value: `$${earnings.today.toFixed(2)}`, icon: DollarSign, color: 'var(--success)', bg: '#F0FDF4' },
                  { label: 'Pedidos activos', value: String(workOrders.length), icon: Package, color: 'var(--brand)', bg: '#EDE9FE' },
                  { label: 'Calificacion', value: driverRating > 0 ? driverRating.toFixed(2) : '-', icon: Star, color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Balance', value: `$${earnings.balance.toFixed(2)}`, icon: DollarSign, color: '#3B82F6', bg: '#EFF6FF' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-card rounded-2xl p-4 shadow-sm">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: stat.bg }}>
                        <Icon size={18} style={{ color: stat.color }} />
                      </div>
                      <p className="font-bold text-text-primary">{stat.value}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4 px-4 pt-4">
                <div className="bg-card rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-text-primary font-medium text-sm">Pedido activo</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>
                      {isOnline ? 'En linea' : 'Desconectado'}
                    </span>
                  </div>
                  {activeOrder ? (
                    <DriverOrderCard
                      order={activeOrder}
                      primary
                      busy={updatingStatus === activeOrder.id}
                      location={driverLocation}
                      locationError={locationError}
                      onAction={() => handleStatusAction(activeOrder)}
                      onEvidence={() => setShowEvidence(true)}
                      onChat={() => openChat(activeOrder)}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Bike size={40} className="mx-auto text-text-secondary" />
                      <p className="font-medium text-text-primary mt-3">Sin pedidos asignados</p>
                      <p className="text-sm text-text-secondary mt-1">Cuando una tienda te asigne un pedido aparecera aqui.</p>
                    </div>
                  )}
                </div>

                <div className="bg-card rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-text-primary font-medium text-sm">Ganancias semana</p>
                    <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--success)' }}>
                      <TrendingUp size={14} />
                      <span>${earnings.week.toFixed(2)}</span>
                    </div>
                  </div>
                  {weeklyHistory.length > 0 ? (
                    <div className="flex items-end gap-2 h-28">
                      {weeklyHistory.map((d, i) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            className="w-full rounded-t-lg"
                            style={{ backgroundColor: i === 4 ? 'var(--brand)' : '#EDE9FE', height: `${(d.earnings / maxEarnings) * 92}px` }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                          />
                          <span style={{ fontSize: 10, color: i === 4 ? 'var(--brand)' : '#9CA3AF' }}>{d.day}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary text-center py-6">Sin datos esta semana</p>
                  )}
                </div>
              </div>

              <div className="px-4 pt-4">
                <div className="bg-card rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-text-primary font-medium text-sm">Pedidos disponibles</p>
                      <p className="text-xs text-text-secondary">Toma un pedido cuando estes listo para repartir.</p>
                    </div>
                    <button
                      onClick={() => loadDashboard(true)}
                      disabled={refreshing}
                      className="w-9 h-9 rounded-full bg-surface-hover text-text-primary flex items-center justify-center"
                      aria-label="Actualizar disponibles"
                    >
                      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {availableOrders.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {availableOrders.slice(0, 4).map((order) => (
                        <AvailableOrderCard
                          key={order.id}
                          order={order}
                          busy={claimingOrder === order.id}
                          disabled={!isOnline}
                          onClaim={() => handleClaimOrder(order)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Package size={32} className="mx-auto text-text-secondary" />
                      <p className="text-sm text-text-secondary mt-2">No hay pedidos disponibles ahora.</p>
                    </div>
                  )}

                  {!isOnline && availableOrders.length > 0 && (
                    <p className="mt-3 text-xs text-yellow-800 bg-yellow-50 rounded-xl px-3 py-2">
                      Conectate para poder tomar pedidos.
                    </p>
                  )}
                </div>
              </div>

              {!isOnline && (
                <motion.div
                  className="mx-4 mt-4 rounded-2xl overflow-hidden flex items-center shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex-1 p-4">
                    <p className="text-white font-bold">Conectate y empieza a repartir</p>
                    <p className="text-white/70 text-sm mt-1">Tu ubicacion solo se comparte durante entregas activas.</p>
                    <button onClick={handleToggleOnline} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FFD400', color: 'var(--brand-dark)' }}>
                      Conectarme ahora
                    </button>
                  </div>
                  <img src={mascot} alt="Rayo" className="w-28 h-auto" />
                </motion.div>
              )}
            </>
          )}

          {activeTab === 'orders' && (
            <div className="px-4 pt-4 space-y-3">
              <h3 className="text-text-primary font-semibold">Pedidos asignados</h3>
              {workOrders.length > 0 ? workOrders.map((order) => (
                <DriverOrderCard
                  key={order.id}
                  order={order}
                  busy={updatingStatus === order.id}
                  onAction={() => handleStatusAction(order)}
                  onEvidence={() => {
                    setChatOrder(order);
                    setShowEvidence(true);
                  }}
                  onChat={() => openChat(order)}
                />
              )) : (
                <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
                  <Bike size={36} className="mx-auto text-text-secondary" />
                  <p className="text-text-secondary text-sm mt-2">No tienes pedidos pendientes.</p>
                </div>
              )}

              <h3 className="text-text-primary font-semibold pt-3">Disponibles para tomar</h3>
              {availableOrders.length > 0 ? availableOrders.map((order) => (
                <AvailableOrderCard
                  key={order.id}
                  order={order}
                  busy={claimingOrder === order.id}
                  disabled={!isOnline}
                  onClaim={() => handleClaimOrder(order)}
                />
              )) : (
                <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
                  <Package size={32} className="mx-auto text-text-secondary" />
                  <p className="text-text-secondary text-sm mt-2">No hay pedidos disponibles ahora.</p>
                </div>
              )}

              <h3 className="text-text-primary font-semibold pt-3">Entregados hoy</h3>
              {todayOrders.length > 0 ? todayOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-hover">
                    <Package size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-text-primary font-medium text-sm">{order.store_name || 'Tienda'}</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--success)' }}>${order.total.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-secondary">{order.id.slice(0, 8)}</span>
                      <span className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
                  <p className="text-text-secondary text-sm">Aun no tienes entregas completadas hoy.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Balance disponible</p>
                <p className="font-bold mt-1" style={{ fontSize: 32 }}>${earnings.balance.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Esta semana', value: `$${earnings.week.toFixed(2)}` },
                  { label: 'Este mes', value: `$${earnings.month.toFixed(2)}` },
                  { label: 'Hoy', value: `$${earnings.today.toFixed(2)}` },
                  { label: 'Entregas', value: tripCount.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="bg-card rounded-2xl p-4 shadow-sm">
                    <p className="font-bold text-text-primary mt-1">{item.value}</p>
                    <p className="text-xs text-text-secondary">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="px-4 pt-4">
              <div className="bg-card rounded-2xl p-5 shadow-sm text-center mb-4">
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#EDE9FE' }}>
                  <Bike size={36} style={{ color: 'var(--brand)' }} />
                </div>
                <p className="text-text-primary font-bold">{user?.full_name || 'Conductor'}</p>
                <p className="text-sm text-text-secondary mt-0.5">Repartidor</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star size={15} fill="#FFD400" stroke="#FFD400" />
                  <span className="text-sm font-medium">{driverRating > 0 ? driverRating.toFixed(2) : '-'}</span>
                  <span className="text-xs text-text-secondary">({tripCount.toLocaleString()} entregas)</span>
                </div>
              </div>
              {[
                ['Mis documentos', Package],
                ['Vehiculo', Bike],
                ['Ubicacion activa', LocateFixed],
                ['Cerrar sesion', ChevronRight],
              ].map(([label, Icon]) => (
                <button
                  key={label as string}
                  onClick={() => label === 'Cerrar sesion' && logout()}
                  className="w-full bg-card rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm mb-2 text-left"
                >
                  <Icon size={20} />
                  <span className="flex-1 text-text-primary font-medium">{label as string}</span>
                  <ChevronRight size={16} className="text-text-secondary" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showEvidence && (
          <DeliveryEvidenceModal
            onSubmit={handleDeliveryEvidence}
            onClose={() => setShowEvidence(false)}
          />
        )}
        {showChat && chatOrder && (
          <OrderChat
            orderId={chatOrder.id}
            storeId={chatOrder.store_id}
            storeName={chatOrder.store_name}
            storeEmoji={chatOrder.store_emoji}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface DriverOrderCardProps {
  order: DriverWorkOrder;
  primary?: boolean;
  busy?: boolean;
  location?: DriverLocation | null;
  locationError?: string;
  onAction: () => void;
  onEvidence: () => void;
  onChat: () => void;
}

interface AvailableOrderCardProps {
  order: AvailableDriverOrder;
  busy?: boolean;
  disabled?: boolean;
  onClaim: () => void;
}

function AvailableOrderCard({ order, busy, disabled, onClaim }: AvailableOrderCardProps) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-light">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-card border border-border-light">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate">{order.store_name}</p>
            <p className="text-xs text-text-secondary">Pedido {order.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: 'var(--brand)' }}>${order.total.toFixed(2)}</p>
          <span className="text-xs text-text-secondary">{order.distance_label}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <MapPin size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-text-primary">Entregar a {order.customer_name}</p>
            <p className="text-text-secondary">{order.delivery_address}</p>
          </div>
        </div>
        {order.notes && (
          <p className="text-xs text-text-secondary bg-card rounded-xl px-3 py-2 border border-border-light">{order.notes}</p>
        )}
        <span className="inline-flex text-xs px-2 py-1 rounded-full bg-brand-light text-brand font-medium">
          {STATUS_LABELS[order.status as OrderStatus] || order.status}
        </span>
      </div>

      <button
        onClick={onClaim}
        disabled={disabled || busy}
        className="mt-4 w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        {busy ? <RefreshCw size={16} className="animate-spin" /> : <Bike size={16} />}
        {disabled ? 'Conectate para tomarlo' : 'Tomar pedido'}
      </button>
    </div>
  );
}

function DriverOrderCard({ order, primary = false, busy, location, locationError, onAction, onEvidence, onChat }: DriverOrderCardProps) {
  const action = nextDriverStatus(order.status);
  const waitingForStore = !action && !ACTIVE_DELIVERY_STATUSES.includes(order.status);

  const storeCoords = useMemo<[number, number] | null>(() => {
    return order.store_lat && order.store_lng ? [order.store_lat, order.store_lng] : null;
  }, [order.store_lat, order.store_lng]);

  const destCoords = useMemo<[number, number] | null>(() => {
    return order.delivery_lat && order.delivery_lng ? [order.delivery_lat, order.delivery_lng] : null;
  }, [order.delivery_lat, order.delivery_lng]);

  const currentCoords = useMemo<[number, number] | null>(() => {
    return location ? [location.lat, location.lng] : null;
  }, [location]);

  return (
    <div className={`rounded-2xl p-4 shadow-sm border border-border-light ${primary ? 'bg-surface' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-card border border-border-light">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate">{order.store_name}</p>
            <p className="text-xs text-text-secondary">Pedido {order.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: 'var(--brand)' }}>${order.total.toFixed(2)}</p>
          <span className="text-xs px-2 py-1 rounded-full bg-brand-light text-brand font-medium">
            {STATUS_LABELS[order.status as OrderStatus] || order.status}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex gap-2">
          <MapPin size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-text-primary">Entregar a {order.customer_name}</p>
            <p className="text-text-secondary">{order.delivery_address}</p>
            {storeCoords && destCoords && (
              <button
                onClick={() => {
                  window.open(`https://www.google.com/maps/dir/?api=1&origin=${storeCoords[0]},${storeCoords[1]}&destination=${destCoords[0]},${destCoords[1]}&travelmode=driving`, '_blank');
                }}
                className="mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 active:scale-95 transition-all shadow-sm w-fit"
              >
                <Navigation size={11} className="text-purple-600" />
                Cómo llegar (GPS)
              </button>
            )}
          </div>
        </div>

        {storeCoords && destCoords && (
          <div className="h-44 rounded-xl overflow-hidden relative border border-slate-100 z-0 my-3">
            <MapContainer
              center={storeCoords}
              zoom={13}
              className="h-full w-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <DriverMapController
                storeCoords={storeCoords}
                destCoords={destCoords}
                currentCoords={currentCoords}
              />
              <Marker position={storeCoords} icon={storeIcon}>
                <Popup>{order.store_name}</Popup>
              </Marker>
              <Marker position={destCoords} icon={destIcon}>
                <Popup>{order.customer_name}</Popup>
              </Marker>
              {currentCoords && (
                <Marker position={currentCoords} icon={driverIcon}>
                  <Popup>Mi ubicación</Popup>
                </Marker>
              )}
              {currentCoords ? (
                <>
                  <Polyline positions={[storeCoords, currentCoords]} color="#7C3AED" weight={4} opacity={0.7} />
                  <Polyline positions={[currentCoords, destCoords]} color="#7C3AED" weight={3} opacity={0.5} dashArray="5, 10" />
                </>
              ) : (
                <Polyline positions={[storeCoords, destCoords]} color="#9CA3AF" weight={3} opacity={0.5} dashArray="5, 8" />
              )}
            </MapContainer>
          </div>
        )}

        {order.notes && (
          <p className="text-xs text-text-secondary bg-card rounded-xl px-3 py-2 border border-border-light">{order.notes}</p>
        )}
        {location && (
          <div className="flex gap-2 text-xs text-success bg-green-50 rounded-xl px-3 py-2">
            <Navigation size={14} />
            <span>Ubicacion enviada {new Date(location.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        {locationError && (
          <p className="text-xs text-danger bg-red-50 rounded-xl px-3 py-2">{locationError}</p>
        )}
      </div>

      {waitingForStore && (
        <div className="mt-4 bg-yellow-50 text-yellow-800 rounded-xl px-3 py-2 text-sm">
          Esperando que la tienda deje el pedido listo para retiro.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onChat} className="py-3 rounded-xl bg-surface-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2">
          <MessageCircle size={16} /> Chat
        </button>
        <button onClick={onEvidence} className="py-3 rounded-xl bg-surface-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2">
          <Camera size={16} /> Evidencia
        </button>
      </div>

      {action && (
        <button
          onClick={onAction}
          disabled={busy}
          className="mt-3 w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {busy ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} />}
          {action.label}
        </button>
      )}
    </div>
  );
}
