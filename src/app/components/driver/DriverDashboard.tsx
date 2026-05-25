import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Bell, MapPin, Star, DollarSign, Package, Clock,
  CheckCircle, XCircle, Phone, Navigation, ToggleLeft, ToggleRight,
  TrendingUp, Wallet, History, User,
} from 'lucide-react';
import type { Screen } from '../../types';
import logo from '../../../imports/image-1.png';
import mascot from '../../../imports/image.png';

interface DriverDashboardProps {
  onNavigate: (screen: Screen) => void;
}

const newOrder = {
  id: 'ORD-2847',
  store: 'Burger King',
  storeEmoji: '🍔',
  storeAddress: 'Av. Amazonas N21-147',
  clientName: 'María García',
  clientAddress: 'Calle República E7-123',
  distance: '2.3 km',
  earnings: '$3.80',
  time: '15 min',
  items: 3,
  tip: '$1.00',
};

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

export function DriverDashboard({ onNavigate }: DriverDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'wallet' | 'profile'>('dashboard');
  const [todayEarnings, setTodayEarnings] = useState(18.50);
  const [acceptCountdown, setAcceptCountdown] = useState(30);

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

  const handleAccept = () => {
    setShowOrder(false);
    setTodayEarnings((p) => p + 3.8);
  };

  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: Zap },
    { id: 'orders', label: 'Pedidos', icon: Package },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Perfil', icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md lg:max-w-6xl mx-auto flex flex-col">
      {/* Header */}
      <div
        className="pt-10 pb-5 px-4"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Bienvenido de vuelta</p>
              <p className="text-white font-medium">Carlos Andrés M.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative">
              <Bell size={22} className="text-white" />
              {isOnline && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FFD400', fontSize: 9, color: '#111827' }}
                >
                  1
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isOnline ? '#22C55E' : '#EF4444' }}
              />
              <span style={{ color: isOnline ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>
                {isOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Online */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
          <div>
            <p className="text-white font-medium">Estado de servicio</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {isOnline ? 'Recibiendo pedidos' : 'Actívate para recibir pedidos'}
            </p>
          </div>
          <button onClick={() => setIsOnline(!isOnline)} className="flex-shrink-0">
            {isOnline ? (
              <ToggleRight size={44} style={{ color: '#FFD400' }} />
            ) : (
              <ToggleLeft size={44} style={{ color: 'rgba(255,255,255,0.4)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && (
          <>
            {/* Stats */}
            <div className="px-4 pt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Ganancias hoy', value: `$${todayEarnings.toFixed(2)}`, icon: DollarSign, color: '#22C55E', bg: '#F0FDF4' },
                { label: 'Pedidos hoy', value: '6', icon: Package, color: '#6D28D9', bg: '#EDE9FE' },
                { label: 'Calificación', value: '4.92 ⭐', icon: Star, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Horas activo', value: '4.5 h', icon: Clock, color: '#3B82F6', bg: '#EFF6FF' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: stat.bg }}
                    >
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <p className="font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Weekly Chart */}
            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-900 font-medium text-sm">Ganancias semana</p>
                <div className="flex items-center gap-1 text-sm" style={{ color: '#22C55E' }}>
                  <TrendingUp size={14} />
                  <span>+12%</span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-24">
                {weeklyData.map((d, i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-lg"
                      style={{
                        transformOrigin: 'bottom',
                        backgroundColor: i === 4 ? '#6D28D9' : '#EDE9FE',
                        height: `${(d.earnings / maxEarnings) * 80}px`,
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                    />
                    <span style={{ fontSize: 10, color: i === 4 ? '#6D28D9' : '#9CA3AF' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery map preview */}
            <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
              <div
                className="h-32 flex items-center justify-center relative"
                style={{ backgroundColor: '#E8F0E8' }}
              >
                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {[10, 20, 30, 40].map((v) => (
                    <g key={v}>
                      <line x1={v * 2.5} y1="0" x2={v * 2.5} y2="50" stroke="#6D28D9" strokeWidth="0.3" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="#6D28D9" strokeWidth="0.3" />
                    </g>
                  ))}
                </svg>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path d="M0 30 Q40 28 70 32 Q85 34 100 30" stroke="white" strokeWidth="4" fill="none" />
                  <path d="M30 0 Q32 20 35 50" stroke="white" strokeWidth="3" fill="none" />
                  <path d="M70 0 Q72 25 75 50" stroke="white" strokeWidth="3" fill="none" />
                </svg>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 border-white shadow-lg"
                  style={{ backgroundColor: '#6D28D9', fontSize: 20 }}
                >
                  🛵
                </div>
                <div className="absolute top-2 right-3 bg-white rounded-xl px-3 py-1.5 shadow flex items-center gap-1.5">
                  <MapPin size={12} style={{ color: '#6D28D9' }} />
                  <span className="text-xs text-gray-700">Quito Centro</span>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Zona activa</p>
                  <p className="text-xs text-gray-400">3 pedidos disponibles cerca</p>
                </div>
                <button
                  className="px-4 py-2 rounded-xl text-white text-sm"
                  style={{ backgroundColor: '#6D28D9' }}
                >
                  Ver mapa
                </button>
              </div>
            </div>

            {/* Mascot promo */}
            {!isOnline && (
              <motion.div
                className="mx-4 mt-4 rounded-2xl overflow-hidden flex items-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex-1 p-4">
                  <p className="text-white font-bold">¡Actívate y gana!</p>
                  <p className="text-white/70 text-sm mt-1">Hay 5 pedidos esperando en tu zona</p>
                  <button
                    onClick={() => setIsOnline(true)}
                    className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
                  >
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
            <h3 className="text-gray-900">Historial de hoy</h3>
            {[
              { id: 'ORD-2844', store: 'KFC', emoji: '🍗', earnings: '$4.20', time: '14:32', status: 'delivered', distance: '1.8 km' },
              { id: 'ORD-2840', store: 'Subway', emoji: '🥪', earnings: '$3.50', time: '13:15', status: 'delivered', distance: '2.1 km' },
              { id: 'ORD-2835', store: 'Pizza Hut', emoji: '🍕', earnings: '$5.10', time: '12:00', status: 'delivered', distance: '3.2 km' },
              { id: 'ORD-2830', store: 'McDonald\'s', emoji: '🍔', earnings: '$3.80', time: '11:10', status: 'cancelled', distance: '1.5 km' },
            ].map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F9FAFB', fontSize: 24 }}
                >
                  {order.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-gray-900 font-medium text-sm">{order.store}</p>
                    <p className="font-bold text-sm" style={{ color: order.status === 'delivered' ? '#22C55E' : '#EF4444' }}>
                      {order.status === 'delivered' ? order.earnings : 'Cancelado'}
                    </p>
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
            <div
              className="rounded-2xl p-5 text-white mb-4"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
            >
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Balance disponible</p>
              <p className="font-bold mt-1" style={{ fontSize: 32 }}>$127.40</p>
              <div className="flex gap-4 mt-4">
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
                >
                  Retirar
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/20 text-white"
                >
                  Historial
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Esta semana', value: '$236.50', icon: '📅', color: '#EDE9FE' },
                { label: 'Este mes', value: '$892.30', icon: '📆', color: '#F0FDF4' },
                { label: 'Bonos', value: '$25.00', icon: '🎁', color: '#FFFBEB' },
                { label: 'Comisión plat.', value: '-$89.23', icon: '📊', color: '#FEF2F2' },
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
              <div
                className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ backgroundColor: '#EDE9FE', fontSize: 36 }}
              >
                🧑‍🦱
              </div>
              <p className="text-gray-900 font-bold">Carlos Andrés Morales</p>
              <p className="text-sm text-gray-500 mt-0.5">Repartidor · Quito</p>
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
              ['Soporte', '💬'],
              ['Cerrar sesión', '🚪'],
            ].map(([label, icon]) => (
              <button
                key={label}
                onClick={() => label === 'Cerrar sesión' && onNavigate('login')}
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

      {/* Incoming Order Popup */}
      <AnimatePresence>
        {showOrder && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-end z-50 max-w-md lg:max-w-6xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full rounded-t-3xl p-5 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: '#22C55E' }}
                  />
                  <p className="font-bold text-gray-900">¡Nuevo pedido!</p>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: acceptCountdown < 10 ? '#EF4444' : '#6D28D9' }}
                  >
                    {acceptCountdown}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">Se asignará automáticamente o expirará</p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: 28 }}>{newOrder.storeEmoji}</span>
                  <div>
                    <p className="text-gray-900 font-medium">{newOrder.store}</p>
                    <p className="text-xs text-gray-500">{newOrder.storeAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    <span style={{ fontSize: 14 }}>🏠</span>
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm">{newOrder.clientName}</p>
                    <p className="text-xs text-gray-500">{newOrder.clientAddress}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                {[
                  { label: 'Distancia', value: newOrder.distance, icon: '📍' },
                  { label: 'Tiempo', value: newOrder.time, icon: '⏱️' },
                  { label: 'Ganancias', value: newOrder.earnings, icon: '💵' },
                  { label: 'Propina', value: newOrder.tip, icon: '🎁' },
                ].map((info) => (
                  <div key={info.label} className="flex-1 text-center bg-gray-50 rounded-xl py-2">
                    <p style={{ fontSize: 16 }}>{info.icon}</p>
                    <p className="font-bold text-gray-900 text-sm">{info.value}</p>
                    <p style={{ fontSize: 10, color: '#9CA3AF' }}>{info.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOrder(false)}
                  className="flex-1 py-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-red-500"
                  style={{ borderColor: '#FEE2E2' }}
                >
                  <XCircle size={20} />
                  Rechazar
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 py-4 rounded-2xl text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#22C55E' }}
                >
                  <CheckCircle size={20} />
                  Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-40 max-w-md lg:max-w-6xl mx-auto" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
            >
              <Icon size={22} style={{ color: isActive ? '#6D28D9' : '#9CA3AF' }} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, color: isActive ? '#6D28D9' : '#9CA3AF' }}>{tab.label}</span>
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: '#6D28D9' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}
