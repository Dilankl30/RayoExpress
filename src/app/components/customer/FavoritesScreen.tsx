import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getFavorites, toggleFavorite } from '../../../modules/client/application/client-service';
import type { FavoriteItem } from '../../../shared/types';

export function FavoritesScreen() {
  const { navigate, user } = useAuth();
  const { cartCount } = useCart();
  const [tab, setTab] = useState<'store' | 'product'>('store');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getFavorites(user.id);
      setFavorites(data || []);
    } catch {
      setLoadError('No pudimos cargar tus favoritos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: FavoriteItem) => {
    if (!user) return;
    const result = await toggleFavorite(user.id, item);
    setFavorites(result);
  };

  const filtered = favorites.filter((item) => item.kind === tab);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
          <button onClick={loadFavorites} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-16 lg:pb-10">
      <div className="lg:hidden pt-10 pb-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-lg">Favoritos</h2>
        </div>
        <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
          <ShoppingCart size={22} className="text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 mt-4 lg:mt-0 lg:px-6 lg:pt-8 max-w-5xl mx-auto">
        <div className="hidden lg:flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Guardados</p>
            <h1 className="text-3xl font-black text-text-primary">Favoritos</h1>
            <p className="text-text-secondary mt-1">Tus tiendas y productos favoritos para pedir más rápido.</p>
          </div>
          <button
            onClick={() => navigate('cart')}
            className="relative px-4 py-3 rounded-2xl bg-card shadow-sm flex items-center gap-2 text-text-primary font-semibold"
          >
            <ShoppingCart size={18} />
            Carrito
            {cartCount > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: '#FFD400', color: '#111827' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex bg-card rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setTab('store')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'store' ? 'text-white shadow-sm' : 'text-text-secondary'}`}
            style={tab === 'store' ? { backgroundColor: 'var(--brand)' } : {}}
          >
            Tiendas
          </button>
          <button
            onClick={() => setTab('product')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'product' ? 'text-white shadow-sm' : 'text-text-secondary'}`}
            style={tab === 'product' ? { backgroundColor: 'var(--brand)' } : {}}
          >
            Productos
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <Heart size={48} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
            <p className="font-medium">Aún no tienes favoritos</p>
            <p className="text-sm mt-1">
              {tab === 'store' ? 'Agrega tiendas a favoritos para encontrarlas rápido' : 'Guarda productos que te gusten'}
            </p>
            <button
              onClick={() => navigate('home')}
              className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Explorar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
            {filtered.map((item, i) => (
              <motion.div
                key={`${item.kind}-${item.id}`}
                className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: '#F3F4F6' }}>
                  {item.emoji || '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium truncate">{item.name}</p>
                  <p className="text-xs text-text-secondary truncate">{item.subtitle}</p>
                  {item.price && <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--brand)' }}>${item.price.toFixed(2)}</p>}
                </div>
                <button
                  onClick={() => handleRemove(item)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50"
                  aria-label="Quitar de favoritos"
                >
                  <Heart size={16} className="text-red-500" fill="#EF4444" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
