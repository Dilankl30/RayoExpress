import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Minus, Trash2, Tag,
  Banknote, Smartphone, Zap, CheckCircle, Upload, FileText, MapPin, Bike,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { createOrder } from '../../../modules/orders/application/order-service';
import { uploadReceipt, savePaymentReceipt } from '../../../modules/payments/application/payment.service';

const paymentMethods = [
  { id: 'cash', label: 'Efectivo', icon: Banknote, color: '#118C62' },
  { id: 'transfer', label: 'Transferencia', icon: Smartphone, color: '#6D28D9' },
];

export function CartScreen() {
  const { navigate } = useAuth();
  const { cart, cartCount, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [tip, setTip] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('Av. Amazonas, Quito');
  const [billingName, setBillingName] = useState('');
  const [billingId, setBillingId] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [replacement, setReplacement] = useState('Elegir reemplazos');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const delivery = cartTotal > 0 ? 1.50 : 0;
  const discount = couponApplied ? cartTotal * 0.15 : 0;
  const tax = (cartTotal - discount) * 0.12;
  const total = cartTotal + delivery + tax - discount + tip;

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'RAYO15' || coupon.toUpperCase() === 'RAYO1') {
      setCouponApplied(true);
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!address.trim()) {
      setError('Ingresa una dirección de entrega');
      return;
    }
    if (payMethod === 'transfer' && !receiptFile) {
      setError('Sube el comprobante de pago');
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const result = await createOrder({
        storeId: cart[0].storeId || '',
        productIds: cart.map((i) => i.id),
        quantities: cart.map((i) => i.quantity),
        deliveryAddress: address,
        paymentMethod: payMethod as 'cash' | 'transfer',
        couponCode: couponApplied ? coupon : undefined,
        notes: [note, replacement ? `Agotados: ${replacement}` : '', billingName ? `Factura: ${billingName} ${billingId}` : '', cashAmount ? `Cambio para ${cashAmount}` : ''].filter(Boolean).join(' | ') || undefined,
        tip,
      });
      if (payMethod === 'transfer' && receiptFile) {
        const receiptUrl = await uploadReceipt(result.order_id, receiptFile);
        await savePaymentReceipt(result.order_id, 'transfer', result.total, receiptUrl);
      } else {
        await savePaymentReceipt(result.order_id, payMethod, result.total, null);
      }
      clearCart();
      navigate('tracking');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear pedido');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <div
        className="pt-10 pb-4 px-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}
      >
        <button
          onClick={() => navigate('home')}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h2 className="text-white">Mi Carrito</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {cart.length === 0 ? 'Vacío' : `${cartCount} productos`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36 lg:pb-8">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span style={{ fontSize: 64 }}>🛒</span>
            <h3 className="text-gray-700 mt-4">Tu carrito está vacío</h3>
            <p className="text-gray-400 text-sm mt-2">Explora nuestras tiendas y agrega lo que quieras</p>
            <button
              onClick={() => navigate('home')}
              className="mt-6 px-6 py-3 rounded-2xl text-white"
              style={{ backgroundColor: '#6D28D9' }}
            >
              Explorar tiendas
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
              <span style={{ fontSize: 28 }}>{cart[0]?.emoji || '🍔'}</span>
              <div>
                <p className="text-gray-900 font-medium text-sm">{cart[0]?.storeName || 'Tienda'}</p>
                <p className="text-xs text-gray-400">Entrega: 25-35 min</p>
              </div>
            </div>

            <div className="lg:flex lg:gap-4 lg:px-4 lg:pt-4 lg:max-w-7xl lg:mx-auto">
              {/* Left column: items + notes + coupon */}
              <div className="lg:flex-1 lg:space-y-3 lg:min-w-0">

            <div className="px-4 pt-4 space-y-3 lg:px-0 lg:pt-0">
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
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center"
                      >
                        <Minus size={13} className="text-gray-600" />
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#6D28D9' }}
                      >
                        <Plus size={13} className="text-white" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center ml-1"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-2">Dirección de entrega</p>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Tu dirección"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="text-2xl font-bold text-[#12001f]">Datos de entrega</h3>
              <div className="flex gap-3">
                <Bike size={24} className="text-[#12001f]" />
                <div className="flex-1">
                  <p className="font-bold text-[#12001f]">Delivery</p>
                  <p className="text-gray-500">20-40 min</p>
                </div>
                <button className="font-bold text-[#12001f]">Cambiar</button>
              </div>
              <div className="flex gap-3">
                <MapPin size={24} className="text-[#12001f]" />
                <div className="flex-1">
                  <p className="font-bold text-[#12001f]">Lo recibes en</p>
                  <p className="text-gray-500">{address}</p>
                </div>
                <button className="font-bold text-[#12001f]">Cambiar</button>
              </div>
              <div className="flex gap-3">
                <FileText size={24} className="text-[#12001f]" />
                <div className="flex-1">
                  <p className="font-bold text-[#12001f]">Instrucciones de entrega</p>
                  <p className="text-gray-500">{note || 'Sin instrucciones'}</p>
                </div>
                <button className="font-bold text-[#12001f]">Editar</button>
              </div>
            </div>

            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-2">Nota para el restaurante</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sin cebolla, extra salsa..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none resize-none placeholder:text-gray-400"
                rows={2}
              />
            </div>

            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#12001f]">Que prefieres si hay productos agotados?</p>
                  <p className="text-gray-500">{replacement}</p>
                </div>
                <button
                  onClick={() => setReplacement(replacement === 'Elegir reemplazos' ? 'Cancelar productos agotados' : 'Elegir reemplazos')}
                  className="font-bold text-[#12001f]"
                >
                  Editar
                </button>
              </div>
            </div>

            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-2xl font-bold text-[#12001f] mb-3">Datos de facturacion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Nombre o razon social" className="bg-gray-50 rounded-xl px-3 py-3 outline-none text-sm" />
                <input value={billingId} onChange={(e) => setBillingId(e.target.value)} placeholder="Cedula/RUC" className="bg-gray-50 rounded-xl px-3 py-3 outline-none text-sm" />
              </div>
            </div>

            <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
              {couponApplied ? (
                <div className="flex items-center gap-2" style={{ color: '#22C55E' }}>
                  <CheckCircle size={18} />
                  <p className="text-sm font-medium">Cupón aplicado · 15% descuento</p>
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
            </div>

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

            </div>

              {/* Right column: summary + payment */}
              <div className="lg:w-96 lg:flex-shrink-0 lg:space-y-3">

            <div className="mx-4 mt-3 lg:mt-0 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-3">Método de pago</p>
              <div className="flex gap-2">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  const isActive = payMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPayMethod(pm.id)}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm transition-all"
                      style={{
                        backgroundColor: isActive ? '#EDE9FE' : '#F9FAFB',
                        border: isActive ? '2px solid #6D28D9' : '2px solid transparent',
                      }}
                    >
                      <Icon size={20} style={{ color: isActive ? '#6D28D9' : '#9CA3AF' }} />
                      <span style={{ color: isActive ? '#6D28D9' : '#6B7280', fontSize: 10 }}>{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              {payMethod === 'transfer' && (
                <div className="mt-3">
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <div className="relative bg-gray-50 rounded-xl overflow-hidden">
                        <img src={receiptPreview} alt="Comprobante" className="w-full h-32 object-contain" />
                        <button onClick={() => { setReceiptFile(null); setReceiptPreview(null); }} className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 text-xs">
                        <CheckCircle size={14} /> {receiptFile?.name}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => receiptRef.current?.click()}
                      className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-1 hover:border-purple-300 transition-colors"
                    >
                      <Upload size={18} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Subir comprobante</span>
                    </button>
                  )}
                  <input
                    ref={receiptRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>
              )}
              {payMethod === 'cash' && (
                <div className="mt-3">
                  <input
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Con cuanto pagas? Ej. 10.00"
                    className="w-full bg-gray-50 rounded-xl px-3 py-3 outline-none text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mx-4 mt-3 lg:mt-0 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 font-medium mb-3">Resumen</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>${delivery.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between" style={{ color: '#22C55E' }}>
                    <span>Descuento</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>IVA (12%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Propina</span>
                  <span>${tip.toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span style={{ color: '#6D28D9' }}>${total.toFixed(2)}</span>
                </div>
              </div>
              {/* Desktop confirm button */}
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="hidden lg:flex w-full mt-3 py-4 rounded-2xl text-white shadow-lg items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#6D28D9' }}
              >
                <Zap size={17} style={{ color: '#FFD400' }} fill="#FFD400" />
                {placing ? 'Procesando...' : `Confirmar pedido`}
              </button>
            </div>
              </div>
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed lg:hidden bottom-0 left-0 right-0 px-4 pb-6 pt-3 max-w-md mx-auto" style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}>
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full py-4 rounded-2xl text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#6D28D9' }}
          >
            <Zap size={17} style={{ color: '#FFD400' }} fill="#FFD400" />
            {placing ? 'Procesando...' : `Confirmar pedido · $${total.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}
