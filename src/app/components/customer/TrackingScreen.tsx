import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Phone, MessageCircle, Star, CheckCircle, Clock, Bike } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const orderStatuses = [
  { id: 'pending', label: 'Pedido recibido', desc: 'Esperando confirmación de la tienda', icon: '📋' },
  { id: 'accepted', label: 'Pedido aceptado', desc: 'La tienda está preparando tu pedido', icon: '✅' },
  { id: 'preparing', label: 'Preparando', desc: 'Los cocineros están trabajando...', icon: '👨‍🍳' },
  { id: 'ready', label: 'Listo para retirar', desc: 'El repartidor va a buscarlo', icon: '📦' },
  { id: 'on_the_way', label: 'En camino', desc: 'Tu repartidor está cerca', icon: '🛵' },
  { id: 'delivered', label: 'Entregado', desc: '¡Buen provecho!', icon: '🎉' },
];

export function TrackingScreen() {
  const { navigate } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [eta, setEta] = useState(18);
  const [driverPos, setDriverPos] = useState({ x: 30, y: 60 });
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (currentStep >= orderStatuses.length - 1) return;
    const stepTimer = setTimeout(() => {
      setCurrentStep((p) => Math.min(p + 1, orderStatuses.length - 1));
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
    if (currentStep === orderStatuses.length - 1) {
      setTimeout(() => setShowRating(true), 1500);
    }
  }, [currentStep]);

  const isDelivered = currentStep === orderStatuses.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <div
        className="pt-10 pb-4 px-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}
      >
        <button
          onClick={() => navigate('home')}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <h3 className="text-white">Seguimiento</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Pedido en curso</p>
        </div>
        <div className="w-9" />
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

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 40 Q30 38 50 45 Q70 52 100 48" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M0 40 Q30 38 50 45 Q70 52 100 48" stroke="#D1FAE5" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2,3" />
            <path d="M25 0 Q28 30 30 50 Q32 70 35 100" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M60 0 Q62 25 65 50 Q68 75 70 100" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path
              d={`M${driverPos.x} ${driverPos.y} Q60 55 80 80`}
              stroke="#6D28D9" strokeWidth="2" fill="none"
              strokeDasharray="3,2" strokeLinecap="round"
            />
          </svg>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[
              [5, 55, 15, 20], [22, 60, 12, 15], [45, 55, 18, 22], [68, 58, 14, 18],
              [85, 55, 12, 20], [5, 10, 20, 25], [30, 5, 25, 30], [60, 8, 18, 22],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} fill="#C8D8C0" rx="1" />
            ))}
          </svg>

          <div className="absolute flex flex-col items-center" style={{ left: '75%', top: '72%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ backgroundColor: '#22C55E' }}>
              <span style={{ fontSize: 16 }}>🍔</span>
            </div>
            <div className="bg-white px-1.5 py-0.5 rounded text-xs font-medium shadow mt-0.5" style={{ color: '#22C55E' }}>
              Tienda
            </div>
          </div>

          <div className="absolute flex flex-col items-center" style={{ left: '85%', top: '85%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ backgroundColor: '#3B82F6' }}>
              <span style={{ fontSize: 16 }}>🏠</span>
            </div>
            <div className="bg-white px-1.5 py-0.5 rounded text-xs font-medium shadow mt-0.5" style={{ color: '#3B82F6' }}>
              Tú
            </div>
          </div>

          <motion.div
            className="absolute flex flex-col items-center"
            style={{ left: `${driverPos.x}%`, top: `${driverPos.y}%`, transform: 'translate(-50%, -50%)' }}
            animate={{ left: `${driverPos.x}%`, top: `${driverPos.y}%` }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-3 border-white" style={{ backgroundColor: '#6D28D9', border: '3px solid white' }}>
              <span style={{ fontSize: 18 }}>🛵</span>
            </div>
            <div className="px-2 py-0.5 rounded-full text-xs font-bold shadow mt-0.5 text-white" style={{ backgroundColor: '#6D28D9' }}>
              Rayo
            </div>
          </motion.div>

          {!isDelivered && (
            <div className="absolute top-3 left-3 bg-white rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2">
              <Clock size={15} style={{ color: '#6D28D9' }} />
              <div>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>Llega en</p>
                <p className="font-bold" style={{ color: '#6D28D9', fontSize: 16 }}>{eta} min</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="lg:flex lg:gap-4 lg:mt-4">

        <div className="bg-white px-4 py-4 shadow-sm lg:rounded-2xl lg:flex-1">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDelivered ? '#F0FDF4' : '#EDE9FE', fontSize: 22 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: isDelivered ? 0 : Infinity, duration: 1.5 }}
            >
              {orderStatuses[currentStep].icon}
            </motion.div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">{orderStatuses[currentStep].label}</p>
              <p className="text-sm text-gray-500">{orderStatuses[currentStep].desc}</p>
            </div>
            {isDelivered && <CheckCircle size={22} style={{ color: '#22C55E' }} />}
          </div>

          <div className="flex items-center gap-1 mt-4">
            {orderStatuses.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{ backgroundColor: i <= currentStep ? '#6D28D9' : '#E5E7EB' }}
              />
            ))}
          </div>
        </div>

        <div className="mx-4 lg:mx-0 mt-4 lg:mt-0 bg-white rounded-2xl p-4 shadow-sm lg:w-80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE', fontSize: 24 }}>
              🧑‍🦱
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">Carlos Andrés M.</p>
              <div className="flex items-center gap-1">
                <Star size={12} fill="#FFD400" stroke="#FFD400" />
                <span className="text-xs text-gray-500">4.92 · 1,247 entregas</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                <Phone size={16} style={{ color: '#22C55E' }} />
              </button>
              <button className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}>
                <MessageCircle size={16} style={{ color: '#6D28D9' }} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            <Bike size={13} />
            <span>Honda PCX 150 · ABC-1234 · Morado</span>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-900 font-medium text-sm mb-3">Tu pedido</p>
            <div className="space-y-2">
            {[
              { name: 'Combo Whopper', qty: 1, price: 8.99 },
              { name: 'Papas Grandes', qty: 1, price: 2.99 },
            ].map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.qty}x {item.name}</span>
                <span className="text-gray-900">${item.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span style={{ color: '#6D28D9' }}>$13.98</span>
            </div>
          </div>
          </div>

          </div>
        </div>

        {showRating && (
          <motion.div
            className="mx-4 mt-4 rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-white font-bold mb-1">¡Pedido entregado! 🎉</p>
            <p className="text-white/70 text-sm mb-4">¿Cómo calificarías tu experiencia?</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star
                    size={28}
                    fill={s <= rating ? '#FFD400' : 'none'}
                    stroke={s <= rating ? '#FFD400' : 'rgba(255,255,255,0.5)'}
                  />
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
    </div>
  );
}
