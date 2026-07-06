import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Clock, Truck, ChevronRight, ShoppingCart, Percent } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getStores } from '../../../modules/stores/application/store-service';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import type { Database } from '../../../shared/types';

type Store = Database['public']['Tables']['stores']['Row'];

const SUPERMARKET_NAMES = ['supermercado', 'farmacia', 'mercado'];

export function SuperScreen() {
  const { navigate } = useAuth();
  const { cartCount } = useCart();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState<'all' | 'open' | 'promo'>('all');

  useEffect(() => {
    loadSupermarkets();
  }, []);

  const loadSupermarkets = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const allStores = await getStores();
      const supermarkets = allStores.filter(s =>
        SUPERMARKET_NAMES.some(name => s.name.toLowerCase().includes(name)) ||
        s.name.toLowerCase().includes('super') ||
        s.name.toLowerCase().includes('market')
      );
      setStores(supermarkets.length > 0 ? supermarkets : allStores.slice(6, 9));
    } catch {
      setLoadError('No pudimos cargar los supermercados.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = stores.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchOpen = filterOpen === 'all' || (filterOpen === 'open' && s.is_open) || (filterOpen === 'promo' && s.delivery_fee === 0);
    return matchSearch && matchOpen;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Cargando supermercados...</p>
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
          <button onClick={loadSupermarkets} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, #2563EB, #1D4ED8)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-bold text-lg">Súper</h2>
            <p className="text-xs text-white/60">Supermercados y farmacias</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
              <ShoppingCart size={22} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl flex items-center gap-2 px-4 py-3">
          <Search size={17} className="text-text-secondary flex-shrink-0" />
          <input
            aria-label="Buscar en súper"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tienda o producto..."
            className="flex-1 outline-none text-text-primary placeholder:text-text-secondary text-sm bg-transparent"
          />
          <button className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2563EB' }} aria-label="Filtrar">
            <Filter size={14} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'open', 'promo'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterOpen(opt)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition-all ${
                filterOpen === opt ? 'text-white' : 'bg-card text-text-secondary border border-border-light'
              }`}
              style={filterOpen === opt ? { backgroundColor: 'var(--brand)' } : {}}
            >
              {opt === 'all' ? 'Todos' : opt === 'open' ? 'Abiertos' : 'Con envío gratis'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <span className="text-4xl mb-3 block">🛒</span>
            <p className="font-medium">No encontramos resultados</p>
            <p className="text-sm mt-1">Intenta con otros filtros o términos de búsqueda</p>
            <button onClick={() => { setSearch(''); setFilterOpen('all'); }} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: 'var(--brand)' }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {filtered.map((store, i) => (
              <motion.button
                key={store.id}
                onClick={() => navigate('store-detail', { storeId: store.id })}
                className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl" style={{ backgroundColor: store.cover_color ? store.cover_color + '20' : '#F3F4F6' }}>
                  {store.emoji || '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary font-medium truncate">{store.name}</p>
                    {store.is_open ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Abierto</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Cerrado</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{store.description || ''}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Clock size={11} /> 25-35 min
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: store.delivery_fee === 0 ? 'var(--success)' : '#6B7280' }}>
                      <Truck size={11} />
                      {store.delivery_fee === 0 ? 'Gratis' : `$${store.delivery_fee.toFixed(2)}`}
                    </span>
                    {store.delivery_fee === 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600"><Percent size={11} />Promo</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-secondary flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
