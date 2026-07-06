import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, DollarSign, Package,
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  TrendingUp, ChevronRight, Camera, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { OrderChat } from '../../../modules/chat/ui/OrderChat';
import {
  getDriverEarnings, setDriverOnline, getDriverProfile,
  getDriverWeeklyHistory, getDriverOrdersToday, getDriverTripCount,
} from '../../../modules/delivery/application/driver.service';
import { DeliveryEvidenceModal } from '../../../modules/delivery/ui/DeliveryEvidenceModal';
import { uploadDeliveryEvidence } from '../../../modules/delivery/application/driver.service';
import { updateOrderStatus } from '../../../modules/orders/application/order-service';
import logo from '../../../imports/image-1.png';
import mascot from '../../../imports/image.png';

export function DriverDashboard() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'wallet' | 'profile'>('dashboard');
  const [acceptCountdown, setAcceptCountdown] = useState(30);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, balance: 0 });
  const [weeklyHistory, setWeeklyHistory] = useState<{ day: string; earnings: number; orders: number }[]>([]);
  const [todayOrders, setTodayOrders] = useState<{ id: string; store_name: string; store_emoji: string; total: number; status: string; created_at: string }[]>([]);
  const [tripCount, setTripCount] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatOrder, setChatOrder] = useState<{ orderId: string; storeId: string; storeName: string; storeEmoji: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [incomingOrder, setIncomingOrder] = useState<{ storeName: string; storeEmoji: string; storeAddress: string; customerAddress: string; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profile, earns, history, orders, trips] = await Promise.all([
          getDriverProfile(user.id),
          getDriverEarnings(user.id),
          getDriverWeeklyHistory(user.id),
          getDriverOrdersToday(user.id),
          getDriverTripCount(user.id),
        ]);
        if (profile) setIsOnline(profile.is_online);
        setDriverRating(profile?.rating ?? 0);
        setEarnings(earns);
        setWeeklyHistory(history);
        setTodayOrders(orders);
        setTripCount(trips);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!isOnline) return;
    const timer = setTimeout(() => {
      setShowOrder(true);
      setIncomingOrder({
        storeName: 'Burger King', storeEmoji: '🍔', storeAddress: 'Av. Amazonas N21-147',
        customerAddress: 'Calle República E7-123', total: 12.50,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  useEffect(() => {
    if (!showOrder) { setAcceptCountdown(30); return; }
    if (acceptCountdown <= 0) { setShowOrder(false); setIncomingOrder(null); return; }
    const t = setTimeout(() => setAcceptCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [showOrder, acceptCountdown]);

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    if (user) await setDriverOnline(user.id, next);
  };

  const handleAccept = () => {
    setShowOrder(false);
    if (incomingOrder) setEarnings((p) => ({ ...p, today: p.today + incomingOrder.total }));
    setIncomingOrder(null);
  };

  const handleDeliveryEvidence = async (file: File, notes: string) => {
    if (!user) return;
    const orderId = todayOrders[0]?.id || 'order-1';
    await uploadDeliveryEvidence(orderId, user.id, file, notes);
    await updateOrderStatus(orderId, 'delivered', 'driver', user?.id);
    setEarnings((p) => ({ ...p, today: p.today + (todayOrders[0]?.total || 3.8) }));
  };

  const maxEarnings = Math.max(...weeklyHistory.map((d) => d.earnings), 1);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Bienvenido de vuelta</p>
              <p className="text-white font-medium">{user?.full_name || 'Conductor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)' }} />
              <span style={{ color: isOnline ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>
                {isOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
          <div>
            <p className="text-white font-medium">Estado de servicio</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {isOnline ? 'Recibiendo pedidos' : 'Actívate para recibir pedidos'}
            </p>
          </div>
          <button onClick={handleToggleOnline} className="flex-shrink-0">
            {isOnline ? <ToggleRight size={44} style={{ color: '#FFD400' }} /> : <ToggleLeft size={44} style={{ color: 'rgba(255,255,255,0.4)' }} />}
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'wallet', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              activeTab === tab ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'
            }`}
            style={activeTab === tab ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {tab === 'dashboard' ? '📊 Dashboard' : tab === 'orders' ? '📋 Pedidos' : tab === 'wallet' ? '💰 Cartera' : '👤 Perfil'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && (
          <>
            <div className="px-4 pt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Ganancias hoy', value: `$${earnings.today.toFixed(2)}`, icon: DollarSign, color: 'var(--success)', bg: '#F0FDF4' },
                { label: 'Pedidos hoy', value: String(todayOrders.length), icon: Package, color: 'var(--brand)', bg: '#EDE9FE' },
                { label: 'Calificación', value: driverRating > 0 ? `${driverRating.toFixed(2)} ⭐` : '—', icon: Star, color: '#F59E0B', bg: '#FFFBEB' },
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

            <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-text-primary font-medium text-sm">Ganancias semana</p>
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--success)' }}>
                  <TrendingUp size={14} />
                  <span>${earnings.week.toFixed(2)}</span>
                </div>
              </div>
              {weeklyHistory.length > 0 ? (
                <div className="flex items-end gap-2 h-24">
                  {weeklyHistory.map((d, i) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className="w-full rounded-t-lg"
                        style={{ backgroundColor: i === 4 ? 'var(--brand)' : '#EDE9FE', height: `${(d.earnings / maxEarnings) * 80}px` }}
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

            {!isOnline && (
              <motion.div
                className="mx-4 mt-4 rounded-2xl overflow-hidden flex items-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex-1 p-4">
                  <p className="text-white font-bold">¡Actívate y gana!</p>
                  <p className="text-white/70 text-sm mt-1">Hay pedidos esperando en tu zona</p>
                  <button onClick={handleToggleOnline} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FFD400', color: 'var(--brand-dark)' }}>
                    Conectarme ahora
                  </button>
                </div>
                <img src={mascot} alt="Rayo" className="w-28 h-auto" />
              </motion.div>
            )}

            <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-medium text-text-primary mb-2">Acción rápida</p>
              <button
                onClick={() => setShowEvidence(true)}
                className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--success)' }}
              >
                <Camera size={16} /> Registrar entrega
              </button>
              <button
                onClick={() => {
                  if (todayOrders.length > 0) {
                    setChatOrder({ orderId: todayOrders[0].id, storeId: '', storeName: todayOrders[0].store_name, storeEmoji: todayOrders[0].store_emoji });
                    setShowChat(true);
                  }
                }}
                className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 mt-2"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                <MessageCircle size={16} /> Chat del pedido
              </button>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="px-4 pt-4 space-y-3">
            <h3 className="text-text-primary font-semibold">Historial de hoy</h3>
            {todayOrders.length > 0 ? todayOrders.map((order) => (
              <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F9FAFB', fontSize: 24 }}>
                  {order.store_emoji || '📦'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-text-primary font-medium text-sm">{order.store_name || 'Tienda'}</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--success)' }}>${order.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-secondary">{order.id.slice(0, 8)}</span>
                    <span className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-success' : 'bg-warning-light text-warning'
                    }`}>{order.status}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
                <p style={{ fontSize: 32 }}>🛵</p>
                <p className="text-text-secondary text-sm mt-2">Sin pedidos hoy</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Balance disponible</p>
              <p className="font-bold mt-1" style={{ fontSize: 32 }}>${earnings.balance.toFixed(2)}</p>
              <div className="flex gap-4 mt-4">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FFD400', color: 'var(--brand-dark)' }}>
                  Retirar
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/20 text-white">
                  Historial
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Esta semana', value: `$${earnings.week.toFixed(2)}`, icon: '📅', color: '#EDE9FE' },
                { label: 'Este mes', value: `$${earnings.month.toFixed(2)}`, icon: '📆', color: '#F0FDF4' },
                { label: 'Hoy', value: `$${earnings.today.toFixed(2)}`, icon: '💰', color: '#FFFBEB' },
                { label: 'Comisión', value: `-$${(earnings.month * 0.15).toFixed(2)}`, icon: '📊', color: '#FEF2F2' },
              ].map((item) => (
                <div key={item.label} className="bg-card rounded-2xl p-4 shadow-sm" style={{ backgroundColor: item.color }}>
                  <p style={{ fontSize: 20 }}>{item.icon}</p>
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
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#EDE9FE', fontSize: 36 }}>
                🧑‍🦱
              </div>
              <p className="text-text-primary font-bold">{user?.full_name || 'Conductor'}</p>
              <p className="text-sm text-text-secondary mt-0.5">Repartidor</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star size={15} fill="#FFD400" stroke="#FFD400" />
                <span className="text-sm font-medium">{driverRating > 0 ? driverRating.toFixed(2) : '—'}</span>
                <span className="text-xs text-text-secondary">({tripCount.toLocaleString()} entregas)</span>
              </div>
            </div>
            {[
              ['Mis documentos', '📄'],
              ['Vehículo', '🛵'],
              ['Configuración', '⚙️'],
              ['Cerrar sesión', '🚪'],
            ].map(([label, icon]) => (
              <button
                key={label}
                onClick={() => label === 'Cerrar sesión' && logout()}
                className="w-full bg-card rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm mb-2 text-left"
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span className="flex-1 text-text-primary font-medium">{label}</span>
                <ChevronRight size={16} className="text-text-secondary" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOrder && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-end z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card w-full rounded-t-3xl p-5 pb-8 max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--success)' }} />
                  <p className="font-bold text-text-primary">¡Nuevo pedido!</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: acceptCountdown < 10 ? 'var(--danger)' : 'var(--brand)' }}>
                  {acceptCountdown}
                </div>
              </div>
              <p className="text-xs text-text-secondary mb-4">Se asignará automáticamente o expirará</p>
              <div className="bg-surface rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: 28 }}>{incomingOrder?.storeEmoji || '🍔'}</span>
                  <div>
                    <p className="text-text-primary font-medium">{incomingOrder?.storeName || 'Tienda'}</p>
                    <p className="text-xs text-text-secondary">{incomingOrder?.storeAddress || 'Dirección'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                    <span style={{ fontSize: 14 }}>🏠</span>
                  </div>
                  <div>
                    <p className="text-text-primary text-sm">Cliente</p>
                    <p className="text-xs text-text-secondary">{incomingOrder?.customerAddress || 'Dirección'}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowOrder(false)} className="flex-1 py-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-danger" style={{ borderColor: '#FEE2E2' }}>
                  <XCircle size={20} /> Rechazar
                </button>
                <button onClick={handleAccept} className="flex-1 py-4 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--success)' }}>
                  <CheckCircle size={20} /> Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showEvidence && (
          <DeliveryEvidenceModal
            onSubmit={handleDeliveryEvidence}
            onClose={() => setShowEvidence(false)}
          />
        )}
        {showChat && chatOrder && (
          <OrderChat
            orderId={chatOrder.orderId}
            storeId={chatOrder.storeId}
            storeName={chatOrder.storeName}
            storeEmoji={chatOrder.storeEmoji}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
