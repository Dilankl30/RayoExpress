import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Copy, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getPromotions, applyCoupon } from '../../../modules/client/application/promotions-service';
import type { Promotion } from '../../../shared/types';

type PromotionTab = 'all' | Promotion['type'];

const tabs: Array<{ id: PromotionTab; label: string; emoji: string }> = [
  { id: 'all', label: 'Todas', emoji: '🎉' },
  { id: 'restaurant', label: 'Restaurantes', emoji: '🍽️' },
  { id: 'super', label: 'Súper', emoji: '🛒' },
  { id: 'shipping', label: 'Envío', emoji: '🚚' },
  { id: 'coupon', label: 'Cupones', emoji: '🎫' },
];

export function PromotionsScreen() {
  const { navigate } = useAuth();
  const { cartCount } = useCart();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<PromotionTab>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; message: string } | null>(null);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPromotions('all');
      setPromotions(data as Promotion[]);
    } catch {
      setLoadError('No pudimos cargar las promociones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  const filteredPromotions = useMemo(
    () => (activeType === 'all' ? promotions : promotions.filter((promotion) => promotion.type === activeType)),
    [activeType, promotions],
  );

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    const result = await applyCoupon(code);
    setCouponResult(result);
    if (result.valid) setCouponInput('');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Cargando promociones...</p>
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
          <button
            onClick={loadPromotions}
            className="px-6 py-2.5 rounded-xl text-white font-medium"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">Promociones</h2>
            <p className="text-xs text-white/60">Ahorra en cada pedido</p>
          </div>
          <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
            <ShoppingCart size={22} className="text-white" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="bg-card/20 rounded-2xl p-4">
          <p className="text-white text-sm font-medium mb-2">¿Tienes un cupón?</p>
          <div className="flex gap-2">
            <input
              aria-label="Código de cupón"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Ingresa el código"
              className="flex-1 bg-white/20 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
              onKeyDown={(event) => event.key === 'Enter' && handleApplyCoupon()}
            />
            <button
              onClick={handleApplyCoupon}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
            >
              Aplicar
            </button>
          </div>
          {couponResult && (
            <div className={`mt-2 text-xs flex items-center gap-1 ${couponResult.valid ? 'text-green-300' : 'text-red-300'}`}>
              {couponResult.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
              {couponResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                activeType === tab.id ? 'text-white' : 'bg-card text-text-secondary border border-border-light'
              }`}
              style={activeType === tab.id ? { backgroundColor: 'var(--brand)' } : {}}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {promotions.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <span className="text-4xl mb-3 block">🎉</span>
            <p className="font-medium">No hay promociones activas</p>
            <p className="text-sm mt-1">Vuelve pronto para nuevas ofertas</p>
            <button
              onClick={() => navigate('home')}
              className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Explorar tiendas
            </button>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <span className="text-4xl mb-3 block">🔍</span>
            <p className="font-medium">Sin promociones en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {filteredPromotions.map((promotion, index) => (
              <motion.div
                key={promotion.id}
                className="bg-card rounded-2xl overflow-hidden shadow-sm"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="p-4 flex items-center gap-4" style={{ background: promotion.bg_color || 'var(--brand)' }}>
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
                    {promotion.emoji || '🎉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold" style={{ color: promotion.text_color || '#FFFFFF' }}>{promotion.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: promotion.text_color || '#FFFFFF', opacity: 0.8 }}>{promotion.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: promotion.text_color || '#FFFFFF' }}
                      >
                        {promotion.discount}
                      </span>
                      {promotion.code && (
                        <button
                          onClick={() => handleCopyCode(promotion.code!)}
                          className="flex items-center gap-1 text-xs font-medium"
                          style={{ color: promotion.text_color || '#FFFFFF' }}
                        >
                          {copiedCode === promotion.code ? (
                            <>
                              <CheckCircle size={12} />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              {promotion.code}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
