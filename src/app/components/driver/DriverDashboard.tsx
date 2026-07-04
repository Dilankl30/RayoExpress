import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, DollarSign, Package,
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  TrendingUp, ChevronRight, Camera, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { OrderChat } from '../../../modules/chat/ui/OrderChat';
import { getDriverEarnings, setDriverOnline, getDriverProfile } from '../../../modules/delivery/application/driver.service';
import { DeliveryEvidenceModal } from '../../../modules/delivery/ui/DeliveryEvidenceModal';
import { uploadDeliveryEvidence } from '../../../modules/delivery/application/driver.service';
import { updateOrderStatus } from '../../../services/orders';
import logo from '../../../imports/image-1.png';
import mascot from '../../../imports/image.png';

const weeklyData = [
  { day: 'L', earnings: 24, orders: 8 },
  { day: 'M', earnings: 31, orders: 11 },
  { day: 'X', earnings: 28, orders: 9 },
  { day: 'J', earnings: 38, orders: 13 },
  { day: 'V', earnings: 45, orders: 16 },
  { day: 'S', earnings: 52, orders: 18 },
  { day: 'D', earnings: 18, orders: 6 },
];

const maxEarnings = Math.max(...weeklyData.map((d) => d.earnings));

export function DriverDashboard() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'wallet' | 'profile'>('dashboard');

  const [acceptCountdown, setAcceptCountdown] = useState(30);
  const [earnings, setEarnings] = useState({ today: 18.50, week: 236.50, month: 892.30, balance: 127.40 });
  const [showEvidence, setShowEvidence] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatOrder, setChatOrder] = useState<{ orderId: string; storeId: string; storeName: string; storeEmoji: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getDriverEarnings(user.id).then(setEarnings).catch(() => {});
    getDriverProfile(user.id).then((p) => { if (p) setIsOnline(p.is_online); }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!isOnline) return;
    const timer = setTimeout(() => setShowOrder(true), 3000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  useEffect(() => {
    if (!showOrder) { setAcceptCountdown(30); return; }
    if (acceptCountdown <= 0) { setShowOrder(false); return; }
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
    setEarnings((p) => ({ ...p, today: p.today + 3.8 }));
  };

  const handleDeliveryEvidence = async (file: File, notes: string) => {
    if (!user) return;
    await uploadDeliveryEvidence('order-1', user.id, file, notes);
    await updateOrderStatus('order-1', 'delivered', user?.id);
    setEarnings((p) => ({ ...p, today: p.today + 3.8 }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}>
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
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isOnline ? '#22C55E' : '#EF4444' }} />
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

      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'wallet', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              activeTab === tab ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'
            }`}
            style={activeTab === tab ? { backgroundColor: '#6D28D9' } : {}}
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
                { label: 'Ganancias hoy', value: `$${earnings.today.toFixed(2)}`, icon: DollarSign, color: '#22C55E', bg: '#F0FDF4' },
                { label: 'Pedidos hoy', value: '6', icon: Package, color: '#6D28D9', bg: '#EDE9FE' },
                { label: 'Calificación', value: '4.92 ⭐', icon: Star, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Balance', value: `$${earnings.balance.toFixed(2)}`, icon: DollarSign, color: '#3B82F6', bg: '#EFF6FF' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: stat.bg }}>
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <p className="font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-900 font-medium text-sm">Ganancias semana</p>
                <div className="flex items-center gap-1 text-sm" style={{ color: '#22C55E' }}>
                  <TrendingUp size={14} />
                  <span>${earnings.week.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-24">
                {weeklyData.map((d, i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-lg"
                      style={{ backgroundColor: i === 4 ? '#6D28D9' : '#EDE9FE', height: `${(d.earnings / maxEarnings) * 80}px` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                    />
                    <span style={{ fontSize: 10, color: i === 4 ? '#6D28D9' : '#9CA3AF' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isOnline && (
              <motion.div
                className="mx-4 mt-4 rounded-2xl overflow-hidden flex items-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex-1 p-4">
                  <p className="text-white font-bold">¡Actívate y gana!</p>
                  <p className="text-white/70 text-sm mt-1">Hay pedidos esperando en tu zona</p>
                  <button onClick={handleToggleOnline} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}>
                    Conectarme ahora
                  </button>
                </div>
                <img src={mascot} alt="Rayo" className="w-28 h-auto" />
              </motion.div>
            )}

            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900 mb-2">Acción rápida</p>
              <button
                onClick={() => setShowEvidence(true)}
                className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#22C55E' }}
              >
                <Camera size={16} /> Registrar entrega
              </button>
              <button
                onClick={() => {
                  setChatOrder({ orderId: 'order-1', storeId: 'store-1', storeName: 'Burger King', storeEmoji: '👑' });
                  setShowChat(true);
                }}
                className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#6D28D9' }}
              >
                <MessageCircle size={16} /> Chat del pedido
              </button>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="px-4 pt-4 space-y-3">
            <h3 className="text-gray-900 font-semibold">Historial de hoy</h3>
            {[
              { id: 'ORD-2844', store: 'KFC', emoji: '🍗', earnings: '$4.20', time: '14:32', status: 'delivered', distance: '1.8 km' },
              { id: 'ORD-2840', store: 'Subway', emoji: '🥪', earnings: '$3.50', time: '13:15', status: 'delivered', distance: '2.1 km' },
              { id: 'ORD-2835', store: 'Pizza Hut', emoji: '🍕', earnings: '$5.10', time: '12:00', status: 'delivered', distance: '3.2 km' },
            ].map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F9FAFB', fontSize: 24 }}>
                  {order.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-gray-900 font-medium text-sm">{order.store}</p>
                    <p className="font-bold text-sm" style={{ color: '#22C55E' }}>{order.earnings}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{order.id}</span>
                    <span className="text-xs text-gray-400">{order.time}</span>
                    <span className="text-xs text-gray-400">{order.distance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Balance disponible</p>
              <p className="font-bold mt-1" style={{ fontSize: 32 }}>${earnings.balance.toFixed(2)}</p>
              <div className="flex gap-4 mt-4">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}>
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
                <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm" style={{ backgroundColor: item.color }}>
                  <p style={{ fontSize: 20 }}>{item.icon}</p>
                  <p className="font-bold text-gray-900 mt-1">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4 pt-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center mb-4">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#EDE9FE', fontSize: 36 }}>
                🧑‍🦱
              </div>
              <p className="text-gray-900 font-bold">{user?.full_name || 'Conductor'}</p>
              <p className="text-sm text-gray-500 mt-0.5">Repartidor</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star size={15} fill="#FFD400" stroke="#FFD400" />
                <span className="text-sm font-medium">4.92</span>
                <span className="text-xs text-gray-400">(1,247 entregas)</span>
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
                className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm mb-2 text-left"
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span className="flex-1 text-gray-700 font-medium">{label}</span>
                <ChevronRight size={16} className="text-gray-400" />
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
              className="bg-white w-full rounded-t-3xl p-5 pb-8 max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#22C55E' }} />
                  <p className="font-bold text-gray-900">¡Nuevo pedido!</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: acceptCountdown < 10 ? '#EF4444' : '#6D28D9' }}>
                  {acceptCountdown}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">Se asignará automáticamente o expirará</p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: 28 }}>🍔</span>
                  <div>
                    <p className="text-gray-900 font-medium">Burger King</p>
                    <p className="text-xs text-gray-500">Av. Amazonas N21-147</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                    <span style={{ fontSize: 14 }}>🏠</span>
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm">Cliente</p>
                    <p className="text-xs text-gray-500">Calle República E7-123</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowOrder(false)} className="flex-1 py-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-red-500" style={{ borderColor: '#FEE2E2' }}>
                  <XCircle size={20} /> Rechazar
                </button>
                <button onClick={handleAccept} className="flex-1 py-4 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: '#22C55E' }}>
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
