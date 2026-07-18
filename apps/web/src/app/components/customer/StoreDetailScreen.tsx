import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Truck, Heart, Share2, Search, Plus, Minus, ShoppingCart, MapPin, Phone } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useCart } from '../../../modules/cart/context/CartContext';
import { getStoreById, getProductsByStore, getCategories } from '../../../modules/stores/application/store-service';
import { checkIsFavorite, toggleFavorite } from '../../../modules/client/application/client-service';
import { getFileUrl } from '../../../shared/storage/storage.service';
import type { CartItem, Database, FavoriteItem } from '../../../shared/types';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Store = Database['public']['Tables']['stores']['Row'];
type Product = Database['public']['Tables']['products']['Row'] & { category?: string };
type Category = Database['public']['Tables']['categories']['Row'];

export function StoreDetailScreen() {
  const { navigate, user } = useAuth();
  const { storeId = '' } = useParams<{ storeId: string }>();
  const { addToCart, cartCount, updateQuantity, cart } = useCart();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRows, setCategoryRows] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storePhotoUrl, setStorePhotoUrl] = useState<string | null>(null);
  const [productImageUrls, setProductImageUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (storeId) {
      loadStore();
    } else {
      setLoading(false);
    }
  }, [storeId, user?.id]);

  const loadStore = async () => {
    try {
      const [storeData, productsData, categoriesData] = await Promise.all([
        getStoreById(storeId),
        getProductsByStore(storeId),
        getCategories(),
      ]);
      if (storeData?.photo_url) {
        getFileUrl('product-images', storeData.photo_url).then(setStorePhotoUrl).catch(() => {});
      }
      const imgMap: Record<string, string | null> = {};
      for (const p of productsData) {
        if (p.image_url) {
          try { imgMap[p.id] = await getFileUrl('product-images', p.image_url); } catch { imgMap[p.id] = null; }
        }
      }
      setProductImageUrls(imgMap);
      setStore(storeData);
      setProducts(productsData);
      setCategoryRows(categoriesData);
      setLiked(user ? await checkIsFavorite(user.id, storeId, 'store') : false);
    } catch {
      setLoadError('No pudimos cargar la tienda. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categoryRows.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categoryRows]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const tabs = [{ id: 'Todo', label: 'Todo' }];

    products.forEach((product) => {
      const id = product.category_id || product.category || '';
      if (!id || seen.has(id)) return;
      seen.add(id);
      tabs.push({
        id,
        label: product.category_id ? categoryNameById.get(product.category_id) || 'Sin categoría' : id,
      });
    });

    return tabs;
  }, [products, categoryNameById]);

  const filtered = products.filter((item) => {
    if (!item) return false;
    const matchCat = activeCategory === 'Todo' || (item.category_id || item.category) === activeCategory;
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getQty = (id: string) => quantities[id] || 0;

  const increment = (item: Product) => {
    const newQty = getQty(item.id) + 1;
    setQuantities((prev) => ({ ...prev, [item.id]: newQty }));
    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      emoji: item.emoji,
      storeId: store?.id,
      storeName: store?.name,
    };
    addToCart(cartItem);
  };

  const handleToggleStoreFavorite = async () => {
    if (!user || !store) return;
    const item: FavoriteItem = {
      id: store.id,
      kind: 'store',
      name: store.name,
      subtitle: store.description || 'Local disponible',
      emoji: store.emoji || '🏪',
    };
    const next = await toggleFavorite(user.id, item);
    setLiked(next.some((fav) => fav.id === store.id && fav.kind === 'store'));
  };

  const handleToggleProductFavorite = async (item: Product) => {
    if (!user || !store) return;
    await toggleFavorite(user.id, {
      id: item.id,
      kind: 'product',
      name: item.name,
      subtitle: store.name,
      emoji: item.emoji || '🛒',
      price: item.price,
      storeId: store.id,
    });
  };

  const decrement = (id: string) => {
    const currentCartQty = cart.find((item) => item.id === id)?.quantity || 0;
    updateQuantity(id, currentCartQty - 1);
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  };

  const totalInCart = Object.values(quantities).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-text-primary font-bold mb-1">Algo salió mal</p>
          <p className="text-sm text-text-secondary mb-4">{loadError}</p>
          <button onClick={() => { setLoadError(null); setLoading(true); loadStore(); }} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-16 lg:pb-0">
      <div
        className="relative h-48 md:h-56 lg:h-64 flex items-end"
        style={{ backgroundColor: store?.cover_color || 'var(--brand)' }}
      >
        {storePhotoUrl ? (
          <img src={storePhotoUrl} alt={store?.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: 80 }}>{store?.emoji || '🏪'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <div className="absolute top-10 left-0 right-0 flex items-center justify-between px-4">
          <button
            onClick={() => navigate('home')}
            aria-label="Volver"
            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
          >
            <ArrowLeft size={18} className="text-text-primary" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStoreFavorite}
              aria-label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
            >
              <Heart size={18} fill={liked ? 'var(--danger)' : 'none'} style={{ color: liked ? 'var(--danger)' : '#374151' }} />
            </button>
            <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md" aria-label="Compartir">
              <Share2 size={18} className="text-text-primary" />
            </button>
            <button className="relative" onClick={() => navigate('cart')} aria-label="Carrito">
              <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                <ShoppingCart size={18} className="text-text-primary" />
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

      <div className="bg-card px-4 py-4 shadow-sm">
        <h2 className="text-text-primary mb-1">{store?.name || 'Tienda'}</h2>
        <p className="text-sm text-text-secondary mb-3">{store?.description || ''}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-sm text-text-secondary">
            <Clock size={14} />
            25-35 min
          </span>
          <span className="flex items-center gap-1 text-sm" style={{ color: store?.delivery_fee === 0 ? 'var(--success)' : '#6B7280' }}>
            <Truck size={14} />
            Envío {store?.delivery_fee ? `$${store.delivery_fee.toFixed(2)}` : 'Gratis'}
          </span>
          {(store?.min_order ?? 0) > 0 && (
            <span className="text-sm text-text-secondary">Mínimo ${store?.min_order.toFixed(2)}</span>
          )}
        </div>
        {(store?.address || store?.phone || store?.city) && (
          <div className="mt-3 pt-3 border-t border-border-light space-y-1">
            {store?.address && (
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <MapPin size={12} /> {store.address}{store.city ? `, ${store.city}` : ''}
              </p>
            )}
            {store?.phone && (
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <Phone size={12} /> {store.phone}
              </p>
            )}
          </div>
        )}
        {store?.latitude && store?.longitude && (
          <div className="mt-3 rounded-xl overflow-hidden border border-border-light shadow-sm" style={{ height: 140 }}>
            <MapContainer center={[store.latitude, store.longitude]} zoom={15} className="h-full w-full" scrollWheelZoom={false} dragging={false} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <Marker position={[store.latitude, store.longitude]} />
            </MapContainer>
          </div>
        )}
      </div>

      <div className="px-4 md:px-0 pt-4 md:pt-0 pb-2 bg-card md:bg-transparent border-b md:border-0 border-border-light">
        <div className="md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          <div className="bg-surface-hover rounded-xl flex items-center gap-2 px-3 py-2.5 md:mt-4">
            <Search size={15} className="text-text-secondary" />
            <input
              aria-label="Buscar en el menú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el menú..."
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border-b border-border-light sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-3 text-sm whitespace-nowrap flex-shrink-0 transition-all relative"
                style={{ color: activeCategory === cat.id ? 'var(--brand)' : '#6B7280' }}
              >
                {cat.label}
                {activeCategory === cat.id && (
                  <motion.div
                    layoutId="category-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--brand)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-4 pb-32 max-w-7xl mx-auto">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-text-secondary">
            <p className="text-3xl mb-2">🍽️</p>
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                className="bg-card rounded-2xl p-4 shadow-sm flex items-start gap-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: '#F9FAFB', fontSize: 36 }}
                >
                  {productImageUrls[item.id] ? (
                    <img src={productImageUrls[item.id]!} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    item.emoji || '🍽️'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-text-primary font-medium flex-1">{item.name}</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{item.description || ''}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--brand)' }}>${item.price?.toFixed(2)}</p>
                      <button
                        className="text-xs font-bold text-text-secondary"
                        onClick={() => handleToggleProductFavorite(item)}
                      >
                        Guardar favorito
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {getQty(item.id) > 0 ? (
                        <div className="flex items-center gap-2 rounded-xl border border-border px-1">
                          <button
                            onClick={() => decrement(item.id)}
                            aria-label="Disminuir cantidad"
                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                          >
                            <Minus size={14} className="text-text-secondary" />
                          </button>
                          <span className="text-sm text-text-primary w-4 text-center font-medium">{getQty(item.id)}</span>
                          <button
                            onClick={() => increment(item)}
                            aria-label="Aumentar cantidad"
                            className="w-7 h-7 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: 'var(--brand)' }}
                          >
                            <Plus size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => increment(item)}
                          aria-label="Agregar al carrito"
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: 'var(--brand)' }}
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
            style={{ backgroundColor: 'var(--brand)' }}
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

