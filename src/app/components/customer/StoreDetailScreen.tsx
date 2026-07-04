import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Truck, Heart, Share2, Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getStoreById, getProductsByStore } from '../../../modules/stores/application/store-service';

export function StoreDetailScreen() {
  const { navigate, navigationParams } = useAuth();
  const { addToCart, cartCount } = useCart();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const storeId = navigationParams.storeId || '';

  useEffect(() => {
    if (storeId) {
      loadStore();
    } else {
      setLoading(false);
    }
  }, [storeId]);

  const loadStore = async () => {
    try {
      const [storeData, productsData] = await Promise.all([
        getStoreById(storeId),
        getProductsByStore(storeId),
      ]);
      setStore(storeData);
      setProducts(productsData);
    } catch (err) {
      console.warn('Error loading store:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todo', ...new Set(products.map((p) => p.category || '').filter(Boolean))];

  const filtered = products.filter((item) => {
    if (!item) return false;
    const matchCat = activeCategory === 'Todo' || item.category === activeCategory;
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getQty = (id: string) => quantities[id] || 0;

  const increment = (item: any) => {
    const newQty = getQty(item.id) + 1;
    setQuantities((prev) => ({ ...prev, [item.id]: newQty }));
    addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1, emoji: item.emoji });
  };

  const decrement = (id: string) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  };

  const totalInCart = Object.values(quantities).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
      <div
        className="relative h-48 md:h-56 lg:h-64 flex items-end"
        style={{ backgroundColor: store?.cover_color || '#6D28D9' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 80 }}>{store?.emoji || '🏪'}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <div className="absolute top-10 left-0 right-0 flex items-center justify-between px-4">
          <button
            onClick={() => navigate('home')}
            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
            >
              <Heart size={18} fill={liked ? '#EF4444' : 'none'} style={{ color: liked ? '#EF4444' : '#374151' }} />
            </button>
            <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md">
              <Share2 size={18} className="text-gray-700" />
            </button>
            <button className="relative" onClick={() => navigate('cart')}>
              <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                <ShoppingCart size={18} className="text-gray-700" />
              </div>
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
        </div>
      </div>

      <div className="bg-white px-4 py-4 shadow-sm">
        <h2 className="text-gray-900 mb-1">{store?.name || 'Tienda'}</h2>
        <p className="text-sm text-gray-500 mb-3">{store?.description || ''}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <Clock size={14} />
            {store?.delivery_time || '25-35 min'}
          </span>
          <span className="flex items-center gap-1 text-sm" style={{ color: store?.delivery_fee === 0 ? '#22C55E' : '#6B7280' }}>
            <Truck size={14} />
            Envío {store?.delivery_fee ? `$${store.delivery_fee.toFixed(2)}` : 'Gratis'}
          </span>
          {store?.min_order > 0 && (
            <span className="text-sm text-gray-500">Mínimo ${store.min_order.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="px-4 md:px-0 pt-4 md:pt-0 pb-2 bg-white md:bg-transparent border-b md:border-0 border-gray-100">
        <div className="md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          <div className="bg-gray-100 rounded-xl flex items-center gap-2 px-3 py-2.5 md:mt-4">
            <Search size={15} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el menú..."
              className="flex-1 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-3 text-sm whitespace-nowrap flex-shrink-0 transition-all relative"
                style={{ color: activeCategory === cat ? '#6D28D9' : '#6B7280' }}
              >
                {cat}
                {activeCategory === cat && (
                  <motion.div
                    layoutId="category-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: '#6D28D9' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-4 pb-32 max-w-7xl mx-auto">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">🍽️</p>
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F9FAFB', fontSize: 36 }}
                >
                  {item.emoji || '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-gray-900 font-medium flex-1">{item.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description || ''}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold" style={{ color: '#6D28D9' }}>${item.price?.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      {getQty(item.id) > 0 ? (
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-1">
                          <button
                            onClick={() => decrement(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                          >
                            <Minus size={14} className="text-gray-600" />
                          </button>
                          <span className="text-sm text-gray-900 w-4 text-center font-medium">{getQty(item.id)}</span>
                          <button
                            onClick={() => increment(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: '#6D28D9' }}
                          >
                            <Plus size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => increment(item)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: '#6D28D9' }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus size={18} className="text-white" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {totalInCart > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 max-w-md lg:max-w-6xl mx-auto"
          style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <button
            onClick={() => navigate('cart')}
            className="w-full py-4 rounded-2xl text-white shadow-lg flex items-center justify-between px-5"
            style={{ backgroundColor: '#6D28D9' }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFD400' }}
            >
              {totalInCart}
            </span>
            <span className="font-medium">Ver carrito</span>
            <span style={{ color: '#FFD400' }}>
              ${filtered.reduce((acc, item) => acc + (item.price || 0) * getQty(item.id), 0).toFixed(2)}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
