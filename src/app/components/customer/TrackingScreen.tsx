import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { OrderChat } from '../../../modules/chat/ui/OrderChat';
import { getMyOrders } from '../../../modules/orders/application/order-service';
import { ORDER_FLOW, STATUS_LABELS, STATUS_ICONS, getStepIndex } from '../../../modules/orders/domain/order-status.machine';
import type { OrderStatus } from '../../../modules/orders/domain/order-status.machine';

const ORDER_HISTORY_KEY = 'rayoexpress-orders';

function loadOrderHistory(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveOrderHistory(orderId: string) {
  try {
    const existing = loadOrderHistory();
    if (!existing.includes(orderId)) {
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify([orderId, ...existing].slice(0, 10)));
    }
  } catch { /* noop */ }
}

export function TrackingScreen() {
  const { navigate, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [eta, setEta] = useState(18);
  const [driverPos, setDriverPos] = useState({ x: 30, y: 60 });
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingOrders(true);
      try {
        const userId = user.id;
        const data = await getMyOrders(userId);
        if (data && data.length > 0) {
          setOrders(data as Record<string, unknown>[]);
          const latest = data[0] as Record<string, unknown>;
          const status = (latest.status as string) || 'pending';
          setCurrentStep(getStepIndex(status as OrderStatus));
          saveOrderHistory(latest.id as string);
        }
      } finally {
        setLoadingOrders(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (currentStep >= ORDER_FLOW.length - 1) return;
    const stepTimer = setTimeout(() => {
      setCurrentStep((p) => Math.min(p + 1, ORDER_FLOW.length - 1));
      setEta((p) => Math.max(0, p - 5));
    }, 4000);
    return () => clearTimeout(stepTimer);
  }, [currentStep]);

  useEffect(() => {
    const moveDriver = setInterval(() => {
      setDriverPos((prev) => ({
        x: Math.max(10, Math.min(80, prev.x + (Math.random() - 0.4) * 8)),
        y: Math.max(20, Math.min(75, prev.y + (Math.random() - 0.5) * 6)),
      }));
    }, 1500);
    return () => clearInterval(moveDriver);
  }, []);

  useEffect(() => {
    if (currentStep === ORDER_FLOW.length - 1) {
      setTimeout(() => setShowRating(true), 1500);
    }
  }, [currentStep]);

  const isDelivered = currentStep === ORDER_FLOW.length - 1;
  const activeStatus = ORDER_FLOW[currentStep] || 'pending';
  const latestOrder = orders[0] as Record<string, unknown> | undefined;
  const currentStatusLabel = STATUS_LABELS[activeStatus as OrderStatus] || 'Pendiente';

  const orderHistory = (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('active')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'active' ? 'text-white' : 'bg-surface-hover text-text-secondary'}`}
          style={view === 'active' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Activo
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'history' ? 'text-white' : 'bg-surface-hover text-text-secondary'}`}
          style={view === 'history' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Historial
        </button>
      </div>

      {loadingOrders ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <span style={{ fontSize: 48 }}>📦</span>
          <p className="text-text-secondary mt-3">No tienes pedidos aún</p>
          <button
            onClick={() => navigate('home')}
            className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            Explorar tiendas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const o = order as Record<string, unknown>;
            const items = (o.order_items as Record<string, unknown>[]) || [];
            const store = o.store as Record<string, unknown> | undefined;
            return (
              <div key={o.id as string} className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 20 }}>{store?.emoji as string || '🍔'}</span>
                    <p className="font-medium text-text-primary text-sm">{store?.name as string || 'Tienda'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand font-medium">
                    {STATUS_LABELS[(o.status as OrderStatus)] || o.status as string}
                  </span>
                </div>
                <div className="space-y-1">
                  {(items as Array<{ product_name?: string; quantity?: number; unit_price?: number }>).slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-text-secondary">
                      {item.quantity}x {item.product_name}
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                  <p className="text-xs text-text-secondary">{new Date(o.created_at as string).toLocaleDateString()}</p>
                  <p className="font-bold text-sm" style={{ color: 'var(--brand)' }}>${(o.total as number)?.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (view === 'history') return orderHistory;

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      <div
        className="pt-10 pb-4 px-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}
      >
        <button onClick={() => navigate('home')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <h3 className="text-white">Seguimiento</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Pedido en curso</p>
        </div>
        <button
          onClick={() => setView('history')}
          className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white"
        >
          Historial
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="relative h-52 md:h-72 lg:h-96 overflow-hidden" style={{ backgroundColor: '#E8F0E8' }}>
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
              <g key={v}>
                <line x1={v} y1="0" x2={v} y2="100" stroke="#6D28D9" strokeWidth="0.3" />
                <line x1="0" y1={v} x2="100" y2={v} stroke="#6D28D9" strokeWidth="0.3" />
              </g>
            ))}
          </svg>

          <div className="absolute flex flex-col items-center" style={{ left: '75%', top: '72%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ backgroundColor: 'var(--success)' }}>
              <span style={{ fontSize: 16 }}>🍔</span>
            </div>
            <div className="bg-card px-1.5 py-0.5 rounded text-xs font-medium shadow mt-0.5" style={{ color: 'var(--success)' }}>
              Tienda
            </div>
          </div>

          <div className="absolute flex flex-col items-center" style={{ left: '85%', top: '85%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ backgroundColor: '#3B82F6' }}>
              <span style={{ fontSize: 16 }}>🏠</span>
            </div>
            <div className="bg-card px-1.5 py-0.5 rounded text-xs font-medium shadow mt-0.5" style={{ color: '#3B82F6' }}>
              Tú
            </div>
          </div>

          <motion.div
            className="absolute flex flex-col items-center"
            style={{ left: `${driverPos.x}%`, top: `${driverPos.y}%`, transform: 'translate(-50%, -50%)' }}
            animate={{ left: `${driverPos.x}%`, top: `${driverPos.y}%` }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-3 border-white" style={{ backgroundColor: 'var(--brand)', border: '3px solid white' }}>
              <span style={{ fontSize: 18 }}>🛵</span>
            </div>
            <div className="px-2 py-0.5 rounded-full text-xs font-bold shadow mt-0.5 text-white" style={{ backgroundColor: 'var(--brand)' }}>
              Rayo
            </div>
          </motion.div>

          {!isDelivered && (
            <div className="absolute top-3 left-3 bg-card rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2">
              <Clock size={15} style={{ color: 'var(--brand)' }} />
              <div>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>Llega en</p>
                <p className="font-bold" style={{ color: 'var(--brand)', fontSize: 16 }}>{eta} min</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="lg:flex lg:gap-4 lg:mt-4">
            <div className="bg-card px-4 py-4 shadow-sm lg:rounded-2xl lg:flex-1">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isDelivered ? '#F0FDF4' : '#EDE9FE', fontSize: 22 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: isDelivered ? 0 : Infinity, duration: 1.5 }}
                >
                  {STATUS_ICONS[activeStatus as OrderStatus] || '📋'}
                </motion.div>
                <div className="flex-1">
                  <p className="text-text-primary font-medium">{currentStatusLabel}</p>
                  <p className="text-sm text-text-secondary">{latestOrder ? (latestOrder.notes as string) || '' : ''}</p>
                </div>
                {isDelivered && <CheckCircle size={22} style={{ color: 'var(--success)' }} />}
              </div>

              <div className="flex items-center gap-1 mt-4">
                {ORDER_FLOW.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full transition-all duration-500"
                    style={{ backgroundColor: i <= currentStep ? 'var(--brand)' : '#E5E7EB' }}
                  />
                ))}
              </div>
            </div>

            {latestOrder && (
              <div className="mx-4 lg:mx-0 mt-4 lg:mt-0 bg-card rounded-2xl p-4 shadow-sm lg:w-80">
                <p className="text-text-primary font-medium text-sm mb-3">Tu pedido</p>
                <div className="space-y-2">
                  {(latestOrder.order_items as Array<{ product_name?: string; quantity?: number; unit_price?: number }> | undefined)?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{item.quantity}x {item.product_name}</span>
                      <span className="text-text-primary">${(item.unit_price ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-surface-hover my-1" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span style={{ color: 'var(--brand)' }}>${(latestOrder.total as number)?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {latestOrder && !isDelivered && (
            <div className="mx-4 mt-3">
              <button
                onClick={() => setShowChat(true)}
                className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                <MessageCircle size={16} /> Chat del pedido
              </button>
            </div>
          )}

          {showRating && (
            <motion.div
              className="mx-4 mt-4 rounded-2xl p-5 text-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-white font-bold mb-1">¡Pedido entregado! 🎉</p>
              <p className="text-white/70 text-sm mb-4">¿Cómo calificarías tu experiencia?</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star size={28} fill={s <= rating ? '#FFD400' : 'none'} stroke={s <= rating ? '#FFD400' : 'rgba(255,255,255,0.5)'} />
                  </button>
                ))}
              </div>
              <button
                className="px-8 py-2.5 rounded-2xl text-sm font-semibold"
                style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
                onClick={() => navigate('home')}
              >
                Enviar calificación
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {showChat && latestOrder && (
        <OrderChat
          orderId={latestOrder.id as string}
          storeId={latestOrder.store_id as string || 'store-1'}
          storeName={(latestOrder.store as Record<string, unknown>)?.name as string || 'Tienda'}
          storeEmoji={(latestOrder.store as Record<string, unknown>)?.emoji as string || '🍔'}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
