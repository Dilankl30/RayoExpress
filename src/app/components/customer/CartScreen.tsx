import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Minus, Trash2, Tag, ChevronRight,
  CreditCard, Banknote, Smartphone, Zap, CheckCircle,
} from 'lucide-react';
import type { Screen, CartItem } from '../../types';

interface CartScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onNavigate: (screen: Screen) => void;
  onPlaceOrder: () => void;
}

const paymentMethods = [
  { id: 'cash', label: 'Efectivo', icon: Banknote, color: '#22C55E' },
  { id: 'card', label: 'Tarjeta', icon: CreditCard, color: '#3B82F6' },
  { id: 'payphone', label: 'PayPhone', icon: Smartphone, color: '#8B5CF6' },
];

export function CartScreen({ cart, setCart, onNavigate, onPlaceOrder }: CartScreenProps) {
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [tip, setTip] = useState<number>(1);
  const [payMethod, setPayMethod] = useState('card');
  const [note, setNote] = useState('');

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const delivery = subtotal > 0 ? 1.50 : 0;
  const discount = couponApplied ? subtotal * 0.15 : 0;
  const tax = (subtotal - discount) * 0.12;
  const total = subtotal + delivery + tax - discount + tip;

  const increment = (id: string) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
  };

  const decrement = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const remove = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'RAYO15' || coupon.toUpperCase() === 'RAYO1') {
      setCouponApplied(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div
        className="pt-10 pb-4 px-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}
      >
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h2 className="text-white">Mi Carrito</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {cart.length === 0 ? 'Vacío' : `${cart.reduce((a, b) => a + b.quantity, 0)} productos`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span style={{ fontSize: 64 }}>🛒</span>
            <h3 className="text-gray-700 mt-4">Tu carrito está vacío</h3>
            <p className="text-gray-400 text-sm mt-2">Explora nuestras tiendas y agrega lo que quieras</p>
            <button
              onClick={() => onNavigate('home')}
              className="mt-6 px-6 py-3 rounded-2xl text-white"
              style={{ backgroundColor: '#6D28D9' }}
            >
              Explorar tiendas
            </button>
          </div>
        ) : (
          <>
            {/* Store header */}
            <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
              <span style={{ fontSize: 28 }}>🍔</span>
              <div>
                <p className="text-gray-900 font-medium text-sm">Burger King</p>
                <p className="text-xs text-gray-400">Entrega: 25-35 min</p>
              </div>
            </div>

            {/* Cart Items */}
            <div className="px-4 pt-4 space-y-3">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#F9FAFB', fontSize: 28 }}
                    >
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{item.name}</p>
                      <p className="font-bold text-sm mt-0.5" style={{ color: '#6D28D9' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => decrement(item.id)}
                        className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center"
                      >
                        <Minus size={13} className="text-gray-600" />
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => increment(item.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#6D28D9' }}
                      >
                        <Plus size={13} className="text-white" />
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center ml-1"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Note */}
            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-2">Nota para el restaurante</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sin cebolla, extra salsa..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none resize-none placeholder:text-gray-400"
                rows={2}
              />
            </div>

            {/* Coupon */}
            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              {couponApplied ? (
                <div className="flex items-center gap-2" style={{ color: '#22C55E' }}>
                  <CheckCircle size={18} />
                  <p className="text-sm font-medium">Cupón RAYO15 aplicado · -15%</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 rounded-xl flex items-center gap-2 px-3 py-2.5">
                    <Tag size={15} className="text-gray-400" />
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Código de descuento"
                      className="flex-1 bg-transparent text-gray-700 text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={applyCoupon}
                    className="px-4 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#6D28D9' }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1.5">Prueba: RAYO15 para 15% off</p>
            </div>

            {/* Driver Tip */}
            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-3">Propina para el repartidor</p>
              <div className="flex gap-2">
                {[0, 0.5, 1, 1.5, 2].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTip(t)}
                    className="flex-1 py-2 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: tip === t ? '#6D28D9' : '#F3F4F6',
                      color: tip === t ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {t === 0 ? 'Sin' : `$${t.toFixed(2)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-700 font-medium">Método de pago</p>
                <button className="text-xs flex items-center gap-0.5" style={{ color: '#6D28D9' }}>
                  Ver más <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex gap-2">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPayMethod(pm.id)}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: payMethod === pm.id ? '#6D28D9' : '#E5E7EB',
                        backgroundColor: payMethod === pm.id ? '#EDE9FE' : '#FAFAFA',
                      }}
                    >
                      <Icon size={18} style={{ color: payMethod === pm.id ? '#6D28D9' : '#9CA3AF' }} />
                      <span className="text-xs" style={{ color: payMethod === pm.id ? '#6D28D9' : '#9CA3AF' }}>
                        {pm.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-3">Resumen del pedido</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span style={{ color: '#22C55E' }}>{delivery === 0 ? 'Gratis' : `$${delivery.toFixed(2)}`}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-sm" style={{ color: '#22C55E' }}>
                    <span>Descuento (15%)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA (12%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Propina</span>
                    <span>${tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold" style={{ color: '#6D28D9' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 max-w-md mx-auto"
          style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}
        >
          <motion.button
            onClick={onPlaceOrder}
            className="w-full py-4 rounded-2xl text-white shadow-lg flex items-center justify-between px-5"
            style={{ backgroundColor: '#6D28D9' }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <Zap size={18} fill="#FFD400" style={{ color: '#FFD400' }} />
              Confirmar Pedido
            </span>
            <span className="font-bold" style={{ color: '#FFD400' }}>${total.toFixed(2)}</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
