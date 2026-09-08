import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Search, Package, Clock, Bike, MapPin, MessageCircle, ChevronRight } from 'lucide-react';
import { getPublicOrderByTrackingCode, normalizeTrackingCode, type PublicOrder } from '../../../modules/orders/application/tracking-public.service';
import { ORDER_FLOW, STATUS_LABELS, STATUS_ICONS, getStepIndex, type OrderStatus } from '../../../modules/orders/domain/order-status.machine';
import logo from '../../../imports/image-1.png';

const RECENT_KEY = 'rayoexpress-tracking-recent';

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(code: string) {
  try {
    const existing = loadRecent().filter((c) => c !== code);
    localStorage.setItem(RECENT_KEY, JSON.stringify([code, ...existing].slice(0, 5)));
  } catch {
    /* noop */
  }
}

function estimateEta(status: OrderStatus): number {
  if (status === 'confirmed') return 35;
  if (status === 'preparing') return 25;
  if (status === 'ready') return 20;
  if (status === 'picked_up') return 18;
  if (status === 'on_the_way') return 12;
  if (status === 'arrived') return 3;
  return 0;
}

function formatCurrency(n: number): string {
  return Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export function PublicTrackingScreen() {
  const params = useParams();
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  const search = async (raw: string) => {
    const normalized = normalizeTrackingCode(raw);
    if (!normalized) {
      setError('Código inválido. Usa el formato RE-000123.');
      setOrder(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicOrderByTrackingCode(normalized);
      setOrder(result);
      saveRecent(normalized);
      setRecent(loadRecent());
      // Actualiza URL sin recargar para poder compartir
      try {
        window.history.replaceState(null, '', `/seguimiento/${normalized}`);
      } catch {
        /* noop */
      }
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : 'No pudimos consultar tu pedido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = (params as { trackingCode?: string })?.trackingCode;
    if (fromUrl && normalizeTrackingCode(fromUrl)) {
      setCode(fromUrl.toUpperCase());
      void search(fromUrl);
    }
    // Carga inicial desde URL /seguimiento/:trackingCode (solo una vez)
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(code);
  };

  const status = (order?.status ?? 'confirmed') as OrderStatus;
  const stepIndex = order ? getStepIndex(status) : -1;
  const eta = order ? estimateEta(status) : 0;
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';

  return (
    <div className="min-h-screen bg-surface">
      {/* Cabecera RayoExpress */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
          <img src={logo} alt="RayoExpress" className="w-9 h-9 object-contain rounded-lg" />
          <span className="font-bold text-xl" style={{ color: 'var(--brand)' }}>RayoExpress</span>
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-surface-hover text-text-secondary">Seguimiento</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 pb-16">
        <h1 className="text-2xl font-extrabold text-text-primary">¿Dónde está mi pedido?</h1>
        <p className="text-sm text-text-secondary mt-1">Ingresa el código que te enviamos por WhatsApp.</p>

        <form onSubmit={handleSubmit} className="mt-4 bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <label className="block text-xs font-medium text-text-secondary mb-1">Código de pedido</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RE-000123"
                inputMode="text"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-sm font-mono bg-surface text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              {loading ? '...' : 'CONSULTAR'}
            </button>
          </div>
          {recent.length > 0 && !order && (
            <div className="flex flex-wrap gap-2 mt-3">
              {recent.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCode(c); void search(c); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-hover text-text-secondary font-mono"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </form>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {order && (
          <div className="mt-4 space-y-4">
            {/* Estado destacado */}
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--brand)' }}>Pedido #{order.tracking_code}</p>
                {!isDelivered && !isCancelled && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary"><Clock size={12} /> ~{eta} min</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#EDE9FE' }}>
                  {STATUS_ICONS[status] || '📦'}
                </div>
                <div>
                  <p className="font-bold text-text-primary">{STATUS_LABELS[status] || status}</p>
                  <p className="text-xs text-text-secondary">
                    {isDelivered ? 'Gracias por confiar en RayoExpress ⚡' : isCancelled ? 'Este pedido fue cancelado.' : order.store_name || 'RayoExpress'}
                  </p>
                </div>
              </div>
              {/* Línea de progreso */}
              <div className="mt-4">
                <div className="flex items-center gap-1">
                  {ORDER_FLOW.map((s, i) => (
                    <div
                      key={s}
                      className="flex-1 h-1.5 rounded-full"
                      style={{ backgroundColor: i <= stepIndex ? 'var(--brand)' : '#E5E7EB' }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-text-secondary">
                  <span>✓ Confirmado</span>
                  <span>✓ Listo</span>
                  <span>● En camino</span>
                  <span>○ Entregado</span>
                </div>
              </div>
            </div>

            {/* Mapa (Fase 4: GPS real. Por ahora placeholder) */}
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} style={{ color: 'var(--brand)' }} />
                <p className="text-sm font-semibold text-text-primary">Ubicación del pedido</p>
              </div>
              <div className="rounded-xl bg-surface border border-border-light p-6 text-center">
                <p className="text-3xl">🗺️</p>
                <p className="text-xs text-text-secondary mt-2">Estamos actualizando la ubicación de tu pedido.</p>
              </div>
            </div>

            {/* Repartidor */}
            {order.driver_name && (
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <Bike size={22} style={{ color: '#22C55E' }} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">🛵 Repartidor</p>
                  <p className="font-bold text-text-primary">{order.driver_name}</p>
                </div>
              </div>
            )}

            {/* Detalle */}
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} style={{ color: 'var(--brand)' }} />
                <p className="text-sm font-semibold text-text-primary">Tu pedido</p>
              </div>
              {order.order_description && (
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{order.order_description}</p>
              )}
              <div className="h-px bg-surface-hover my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">Total de productos</span><span className="text-text-primary">{formatCurrency(order.product_total)}</span></div>
                {order.other_charges > 0 && (
                  <div className="flex justify-between"><span className="text-text-secondary">Otros cargos</span><span className="text-text-primary">{formatCurrency(order.other_charges)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-text-secondary">Servicio RayoExpress</span><span className="text-text-primary">{formatCurrency(order.service_fee)}</span></div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between"><span className="text-text-secondary">Descuento</span><span className="text-text-primary">-{formatCurrency(order.discount_amount)}</span></div>
                )}
                <div className="flex justify-between font-bold pt-1"><span>TOTAL</span><span style={{ color: 'var(--brand)' }}>{formatCurrency(order.total)}</span></div>
              </div>
            </div>

            {/* Ayuda */}
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <p className="text-sm font-semibold text-text-primary">¿Necesitas ayuda?</p>
              <p className="text-xs text-text-secondary mt-1">Escríbenos por WhatsApp con tu código {order.tracking_code}.</p>
              <button
                type="button"
                onClick={() => setCode('')}
                className="mt-3 w-full py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary flex items-center justify-center gap-1"
              >
                Consultar otro pedido <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {!order && !error && (
          <div className="mt-6 bg-card rounded-2xl p-6 text-center border border-border-light">
            <MessageCircle size={28} className="mx-auto text-text-secondary" />
            <p className="text-sm text-text-secondary mt-2">Tu pedido fue confirmado por WhatsApp.<br />Aquí podrás ver su estado en tiempo real.</p>
          </div>
        )}
      </main>
    </div>
  );
}
