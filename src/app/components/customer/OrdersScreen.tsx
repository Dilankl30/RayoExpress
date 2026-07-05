import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Filter, Headphones, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getMockOrders } from '../../../shared/lib/mockData';

const periodOptions = ['Ultima semana', 'Ultimos 15 dias', 'Ultimos 30 dias', 'Ultimos 3 meses', 'Ultimos 6 meses'];

export function OrdersScreen() {
  const { navigate, user } = useAuth();
  const [status, setStatus] = useState<'delivered' | 'cancelled'>('delivered');
  const [period, setPeriod] = useState(periodOptions[2]);
  const [showFilters, setShowFilters] = useState(false);
  const orders = useMemo(() => (user ? getMockOrders(user.id) : []), [user]);
  const visible = orders.filter((order) => status === 'delivered' ? order.status !== 'cancelled' : order.status === 'cancelled');

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-20 bg-white px-4 pt-10 pb-4 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => navigate('home')} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-bold text-[#12001f]">Mis pedidos</h1>
        <button onClick={() => navigate('cart')} className="w-10 h-10 flex items-center justify-center"><ShoppingCart size={24} /></button>
      </header>

      <div className="px-4 pt-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 px-4 py-3 rounded-full font-semibold">
            <Filter size={18} /> Filtros
          </button>
          <button onClick={() => setStatus('delivered')} className="px-5 py-3 rounded-full font-bold" style={{ background: status === 'delivered' ? '#12001f' : '#F3F3F5', color: status === 'delivered' ? 'white' : '#12001f' }}>Entregados</button>
          <button onClick={() => setStatus('cancelled')} className="px-5 py-3 rounded-full font-bold" style={{ background: status === 'cancelled' ? '#12001f' : '#F3F3F5', color: status === 'cancelled' ? 'white' : '#12001f' }}>Cancelados</button>
          <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 px-5 py-3 rounded-full font-bold bg-[#F3F3F5] whitespace-nowrap"><CalendarDays size={18} /> {period}</button>
        </div>

        {visible.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
            <div className="text-5xl mb-5">☰</div>
            <h2 className="text-2xl font-bold text-[#12001f]">No encontramos pedidos para estos filtros</h2>
            <p className="text-gray-500 mt-3">Limpialos y prueba con otros.</p>
            <button onClick={() => { setStatus('delivered'); setPeriod(periodOptions[2]); }} className="mt-6 px-8 py-3 rounded-full bg-[#E90057] text-white font-bold">Limpiar filtros</button>
          </div>
        ) : (
          <div className="space-y-6 pt-6">
            {visible.map((order) => (
              <article key={order.id} className="border-b border-gray-100 pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#EF233C] flex items-center justify-center text-3xl">{order.store?.emoji || '🛒'}</div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="text-emerald-700 font-bold">Entregado</span> {new Date(order.created_at).toLocaleDateString()} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <h2 className="text-xl font-bold text-[#12001f]">{order.store?.name || 'Local'}</h2>
                    <p className="text-gray-500">{order.order_items.length} productos</p>
                  </div>
                  <strong className="text-xl text-[#12001f]">${order.total.toFixed(2)}</strong>
                </div>
                <button onClick={() => navigate('tracking')} className="mt-5 w-full py-4 rounded-full bg-[#F3F3F5] text-[#12001f] font-bold flex items-center justify-center gap-2">
                  <Headphones size={18} /> Ayuda
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white rounded-t-[28px] w-full p-6 pb-8">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#12001f]">Filtrar por</h2>
              <button onClick={() => { setStatus('delivered'); setPeriod(periodOptions[2]); }} className="font-bold">Limpiar filtros</button>
            </div>
            <h3 className="text-xl font-bold mb-3">Periodo</h3>
            {periodOptions.map((option) => (
              <button key={option} onClick={() => setPeriod(option)} className="w-full py-4 flex items-center justify-between text-left">
                <span>{option}</span><span className={`w-6 h-6 rounded-full border-2 ${period === option ? 'border-[#12001f] bg-[#12001f]' : 'border-gray-400'}`} />
              </button>
            ))}
            <h3 className="text-xl font-bold mt-3 mb-3">Estado</h3>
            {(['delivered', 'cancelled'] as const).map((option) => (
              <button key={option} onClick={() => setStatus(option)} className="w-full py-4 flex items-center justify-between text-left">
                <span>{option === 'delivered' ? 'Entregados' : 'Cancelados'}</span><span className={`w-6 h-6 rounded-full border-2 ${status === option ? 'border-[#12001f] bg-[#12001f]' : 'border-gray-400'}`} />
              </button>
            ))}
            <button onClick={() => setShowFilters(false)} className="mt-6 w-full py-4 rounded-full bg-[#E90057] text-white font-bold">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
