import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Bell, ShoppingCart, Search, ChevronRight, Star, Clock,
  Truck, Flame, Tag, ChevronDown, Zap, Filter, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { getStores, getCategories } from '../../../services/stores';
import { getNotifications } from '../../../services/notifications';
import { BottomNav } from '../shared/BottomNav';
import logo from '../../../imports/image-1.png';

const banners = [
  {
    id: '1',
    title: '¡Envío GRATIS!',
    sub: 'En tu primer pedido · Código RAYO15',
    bg: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)',
    text: '#4C1D95',
  },
  {
    id: '2',
    title: '20% OFF Restaurantes',
    sub: 'Solo hoy hasta las 22:00',
    bg: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
    text: '#FFFFFF',
  },
  {
    id: '3',
    title: 'Farmacia Express 24h',
    sub: 'Entrega en 15 minutos',
    bg: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
    text: '#FFD400',
  },
];

export function HomeScreen() {
  const { navigate, user } = useAuth();
  const { cartCount } = useCart();
  const [search, setSearch] = useState('');
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storesData, catsData] = await Promise.all([
        getStores(),
        getCategories(),
      ]);
      setStores(storesData);
      setCategories(catsData);
      if (user) {
        const notifs = await getNotifications(user.id);
        setNotifCount(notifs.filter((n) => !n.read_at).length);
      }
    } catch (err) {
      console.warn('Error loading data:', err);
    }
  };

  const handleSelectStore = (id: string) => {
    navigate('store-detail', { storeId: id });
  };

  const filteredStores = stores.filter((s) => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 relative pb-16 lg:pb-0">
      {/* Header */}
      <div className="pt-10 pb-5 px-4 md:px-6 lg:px-8" style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
              <button className="flex items-center gap-1.5 text-white">
                <MapPin size={14} />
                <div className="text-left">
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Entregar en</p>
                  <p className="text-sm flex items-center gap-1">
                    Av. Amazonas, Quito
                    <ChevronDown size={13} />
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative">
                <Bell size={22} className="text-white" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
                    {notifCount}
                  </span>
                )}
              </button>
              <button className="relative" onClick={() => navigate('cart')}>
                <ShoppingCart size={22} className="text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', color: '#111827', fontSize: 9 }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl flex items-center gap-2 px-4 py-3">
            <Search size={17} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tiendas..."
              className="flex-1 outline-none text-gray-700 placeholder:text-gray-400 text-sm bg-transparent"
            />
            <button className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6D28D9' }}>
              <Filter size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Banners */}
        <div className="mt-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 120 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBanner}
                className="absolute inset-0 flex flex-col justify-center px-5"
                style={{ background: banners[activeBanner].bg }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-bold mb-1" style={{ color: banners[activeBanner].text, fontSize: 17 }}>
                  {banners[activeBanner].title}
                </p>
                <p className="text-sm opacity-80" style={{ color: banners[activeBanner].text }}>
                  {banners[activeBanner].sub}
                </p>
                <div className="mt-2">
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: banners[activeBanner].text }}>
                    Aprovechar →
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-2.5 right-4 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBanner(i)}
                  className="rounded-full h-1.5 transition-all"
                  style={{
                    width: i === activeBanner ? 20 : 6,
                    backgroundColor: i === activeBanner ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">Categorías</h3>
            <button className="text-sm flex items-center gap-1" style={{ color: '#6D28D9' }}>
              Ver todo <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <motion.div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: isActive ? '#6D28D9' : (cat.bg_color || '#F3F4F6'),
                      border: isActive ? '2px solid #6D28D9' : '2px solid transparent',
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-2xl md:text-3xl">{cat.emoji || '📦'}</span>
                  </motion.div>
                  <span className="text-center text-[10px] md:text-xs" style={{ color: isActive ? '#6D28D9' : '#6B7280' }}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Promo Strip */}
        <div className="mt-5 rounded-2xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFD400 0%, #FF8C00 100%)' }}>
          <div>
            <div className="flex items-center gap-1.5">
              <Zap size={16} fill="#4C1D95" style={{ color: '#4C1D95' }} />
              <p className="font-bold text-gray-900">RAYO PASS</p>
            </div>
            <p className="text-sm text-gray-800 mt-0.5">Envíos ilimitados todo el mes</p>
          </div>
          <button className="bg-white px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0" style={{ color: '#6D28D9' }}>
            $4.99/mes
          </button>
        </div>

        {/* Stores */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900 flex items-center gap-2">
              {search ? (
                <><Search size={16} className="text-gray-500" />Resultados</>
              ) : (
                <><Flame size={16} style={{ color: '#FF4500' }} />Populares ahora</>
              )}
            </h3>
            <span className="text-xs text-gray-400">{filteredStores.length} tiendas</span>
          </div>

          {filteredStores.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p>No encontramos resultados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStores.map((store, i) => (
                <motion.button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: store.cover_color ? store.cover_color + '20' : '#F3F4F6', fontSize: 30 }}>
                    {store.emoji || '🏪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{store.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{store.description || ''}</p>
                    {store.delivery_fee !== undefined && (
                      <span className="flex items-center gap-1 text-xs mt-1" style={{ color: store.delivery_fee === 0 ? '#22C55E' : '#6B7280' }}>
                        <Truck size={11} />
                        {store.delivery_fee === 0 ? 'Gratis' : `$${store.delivery_fee.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Trending */}
        <div className="mt-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: '#6D28D9' }} />
            <h3 className="text-gray-900">Tendencias</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['Sushi 🍱', 'Smoothies 🥤', 'Tacos 🌮', 'Helados 🍦', 'Pizzas 🍕', 'Burgers 🍔'].map((item) => (
              <button key={item} className="bg-white px-4 py-2 rounded-full text-sm text-gray-700 flex-shrink-0 shadow-sm border border-gray-100">
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
