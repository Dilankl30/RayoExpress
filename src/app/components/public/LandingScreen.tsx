import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ChevronRight, Star, Clock, Truck,
  Shield, Bike, ArrowRight, Sparkles,
  ShoppingBag, Package, Users,
} from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getStores, getCategories } from '../../../modules/stores/application/store-service';
import logo from '../../../imports/image-1.png';

const banners = [
  {
    id: '1',
    title: '¡Envío GRATIS!',
    sub: 'En tu primer pedido · Usa RAYO15',
    bg: 'linear-gradient(135deg, #FF6B35 0%, #FF8C00 100%)',
    emoji: '🚚',
  },
  {
    id: '2',
    title: '20% OFF en Restaurantes',
    sub: 'Válido hoy hasta las 22:00',
    bg: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
    emoji: '🍽️',
  },
  {
    id: '3',
    title: 'Farmacia Express',
    sub: 'Entrega en 15 minutos · 24/7',
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    emoji: '💊',
  },
  {
    id: '4',
    title: 'Combos desde $5.99',
    sub: 'Las mejores promos de la semana',
    bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    emoji: '🔥',
  },
];

const categories = [
  { name: 'Restaurantes', emoji: '🍽️', color: '#FF6B35' },
  { name: 'Farmácia', emoji: '💊', color: '#059669' },
  { name: 'Supermercado', emoji: '🛒', color: '#2563EB' },
  { name: 'Bebidas', emoji: '🥤', color: '#7C3AED' },
  { name: 'Postres', emoji: '🍰', color: '#DB2777' },
  { name: 'Mascotas', emoji: '🐾', color: '#D97706' },
];

const howItWorks = [
  { icon: ShoppingBag, title: 'Elige', desc: 'Selecciona lo que necesitas de tu tienda favorita' },
  { icon: Bike, title: 'Pide', desc: 'Confirma tu pedido y paga seguro desde la app' },
  { icon: Package, title: 'Recibe', desc: 'Un Rayo lo lleva a tu puerta en minutos' },
];

const testimonials = [
  { name: 'María G.', text: 'Pedí un combo y llegó en 12 minutos. ¡Increíble!', rating: 5 },
  { name: 'Carlos L.', text: 'Nunca había sido tan fácil pedir del super.', rating: 5 },
  { name: 'Ana R.', text: 'El servicio al cliente es excelente. 10/10', rating: 4 },
];

const featuredStores = [
  { name: 'McDonald\'s', emoji: '🍔', color: '#E8F5E9', delivery: '10-15 min', fee: 0, rating: 4.7 },
  { name: 'Burger King', emoji: '👑', color: '#FFF3E0', delivery: '15-20 min', fee: 1.5, rating: 4.5 },
  { name: 'KFC', emoji: '🍗', color: '#FFEBEE', delivery: '15-20 min', fee: 1.0, rating: 4.6 },
  { name: 'Pizza Hut', emoji: '🍕', color: '#E8F5E9', delivery: '20-25 min', fee: 0, rating: 4.4 },
  { name: 'Subway', emoji: '🥪', color: '#FFF8E1', delivery: '10-15 min', fee: 0.5, rating: 4.3 },
  { name: 'Dunkin\'', emoji: '🍩', color: '#E3F2FD', delivery: '10-15 min', fee: 0, rating: 4.8 },
];

export function LandingScreen() {
  const { navigate } = useAuth();
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
      setDbCategories(catsData);
    } catch {
      // public page, silence errors
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate('login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="RayoExpress" className="w-9 h-9 object-contain rounded-lg" />
              <span className="font-bold text-xl" style={{ color: '#6D28D9' }}>RayoExpress</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <button className="text-gray-600 hover:text-purple-700 font-medium transition-colors">Ofertas</button>
              <button className="text-gray-600 hover:text-purple-700 font-medium transition-colors">Tiendas</button>
              <button className="text-gray-600 hover:text-purple-700 font-medium transition-colors">Cómo funciona</button>
              <button className="text-gray-600 hover:text-purple-700 font-medium transition-colors">Contacto</button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('login')}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-purple-700 transition-colors"
              >
                <Users size={16} />
                Iniciar sesión
              </button>
              <button
                onClick={() => navigate('login')}
                className="px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
              >
                Registrarse
              </button>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden flex flex-col gap-1 p-2"
              >
                <div className="w-5 h-0.5 bg-gray-600 rounded" />
                <div className="w-5 h-0.5 bg-gray-600 rounded" />
                <div className="w-5 h-0.5 bg-gray-600 rounded" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                className="md:hidden pb-4 border-t border-gray-100 pt-3 space-y-3"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <button className="block w-full text-left py-2 text-gray-600 font-medium">Ofertas</button>
                <button className="block w-full text-left py-2 text-gray-600 font-medium">Tiendas</button>
                <button className="block w-full text-left py-2 text-gray-600 font-medium">Cómo funciona</button>
                <button className="block w-full text-left py-2 text-gray-600 font-medium">Contacto</button>
                <button onClick={() => navigate('login')} className="block w-full text-left py-2 text-purple-700 font-semibold">
                  Iniciar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #4C1D95 50%, #1E0A3C 100%)' }} />
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 800" preserveAspectRatio="none">
            <circle cx="1200" cy="100" r="300" fill="white" />
            <circle cx="200" cy="600" r="200" fill="white" />
            <circle cx="700" cy="400" r="250" fill="white" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#FFD400' }}>
                  <Sparkles size={14} />
                  Delivery en minutos
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                  Tu comida favorita,{' '}
                  <span style={{ color: '#FFD400' }}>más rápido</span>
                  {' '}que un rayo
                </h1>
                <p className="text-lg md:text-xl mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Pide de tus restaurantes, supermercados y farmacias favoritos. Entrega en minutos.
                </p>

                <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-2xl mb-4 max-w-lg">
                  <div className="flex items-center gap-2 flex-1 pl-3">
                    <Search size={18} className="text-gray-400 flex-shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="¿Qué se te antoja hoy?"
                      className="flex-1 outline-none text-gray-700 placeholder:text-gray-400 text-sm bg-transparent py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}
                  >
                    Buscar
                  </button>
                </form>

                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    onClick={() => navigate('login')}
                    className="px-8 py-3.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    style={{ background: '#FFD400', color: '#4C1D95' }}
                  >
                    Pedir ahora
                    <ArrowRight size={16} />
                  </button>
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <Shield size={14} />
                    <span className="text-xs">Pago seguro</span>
                    <Truck size={14} className="ml-2" />
                    <span className="text-xs">Delivery gratis*</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              className="hidden md:flex justify-center relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative w-80 h-96">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-400/20 to-transparent" />
                <div className="relative grid grid-cols-2 gap-3 p-2">
                  {featuredStores.slice(0, 4).map((s, i) => (
                    <motion.div
                      key={s.name}
                      className="bg-white/90 backdrop-blur rounded-2xl p-4 text-center shadow-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <span className="text-4xl block mb-1">{s.emoji}</span>
                      <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star size={10} fill="#FFD400" stroke="#FFD400" />
                        <span className="text-[10px] text-gray-500">{s.rating}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  className="absolute -bottom-4 -right-4 bg-white rounded-2xl px-5 py-3 shadow-xl"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <div className="flex items-center gap-2">
                    <Bike size={20} style={{ color: '#6D28D9' }} />
                    <div>
                      <p className="text-xs text-gray-400">Entrega en</p>
                      <p className="font-bold text-sm" style={{ color: '#6D28D9' }}>12 min</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== MARQUEE STRIP ===== */}
      <div className="py-3 bg-gray-50 border-y border-gray-100 overflow-hidden">
        <div className="flex gap-8 animate-[scroll_30s_linear_infinite] whitespace-nowrap" style={{ animation: 'scroll 30s linear infinite' }}>
          {[...banners, ...banners].map((b, i) => (
            <span key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg">{b.emoji}</span>
              {b.title} — {b.sub}
            </span>
          ))}
        </div>
      </div>

      {/* ===== OFFERS / BANNERS ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ofertas del día</h2>
              <p className="text-gray-500 mt-1">Aprovecha estos descuentos exclusivos</p>
            </div>
            <button onClick={() => navigate('login')} className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: '#6D28D9' }}>
              Ver todas <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {banners.map((banner, i) => (
              <motion.button
                key={banner.id}
                onClick={() => navigate('login')}
                className="relative rounded-2xl p-5 text-left text-white overflow-hidden group"
                style={{ background: banner.bg }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-5xl absolute right-4 top-4 opacity-30 group-hover:scale-110 transition-transform">{banner.emoji}</span>
                <p className="font-bold text-xl mb-1 relative z-10">{banner.title}</p>
                <p className="text-sm opacity-80 relative z-10 mb-4">{banner.sub}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur relative z-10">
                  Lo quiero <ArrowRight size={12} />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">¿Qué se te antoja?</h2>
              <p className="text-gray-500 mt-1">Explora por categorías</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {(dbCategories.length > 0 ? dbCategories : categories).map((cat, i) => (
              <motion.button
                key={cat.id || cat.name}
                onClick={() => navigate('login')}
                className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: (cat.bg_color || cat.color) + '20' }}
                >
                  <span className="text-3xl md:text-4xl">{cat.emoji || '📦'}</span>
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center">{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Así de fácil funciona</h2>
            <p className="text-gray-500 mt-2">Tres pasos y tienes todo en tu puerta</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: 'linear-gradient(135deg, #6D28D9, #4C1D95)' }}>
                  <step.icon size={32} className="text-white" />
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: '#6D28D9' }}>0{i + 1}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED STORES ===== */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tiendas destacadas</h2>
              <p className="text-gray-500 mt-1">Las favoritas de tu zona</p>
            </div>
            <button onClick={() => navigate('login')} className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: '#6D28D9' }}>
              Ver todo <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(stores.length > 0 ? stores : featuredStores).map((store, i) => (
              <motion.button
                key={store.id || store.name}
                onClick={() => navigate('login')}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: store.cover_color ? store.cover_color + '20' : '#F3F4F6', fontSize: 32 }}
                >
                  {store.emoji || '🏪'}
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{store.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star size={11} fill="#FFD400" stroke="#FFD400" />
                  <span className="text-xs text-gray-500">{store.rating || '4.5'}</span>
                  <span className="text-xs text-gray-300 mx-1">·</span>
                  <Clock size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{store.delivery || '15-20'}</span>
                </div>
                <div className="mt-2 text-xs font-medium" style={{ color: store.fee === 0 || store.delivery_fee === 0 ? '#22C55E' : '#6B7280' }}>
                  {store.fee === 0 || store.delivery_fee === 0 ? '🚚 Envío gratis' : `$${store.delivery_fee?.toFixed(1) || '1.5'} envío`}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Lo que dicen nuestros usuarios</h2>
            <p className="text-gray-500 mt-2">Más de 50,000 pedidos entregados con éxito</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="bg-gray-50 rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} fill={s < t.rating ? '#FFD400' : '#E5E7EB'} stroke={s < t.rating ? '#FFD400' : '#E5E7EB'} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-3">"{t.text}"</p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 50%, #1E0A3C 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para pedir?
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
              Regístrate gratis y obtén envío gratis en tu primer pedido con el código <span className="text-[#FFD400] font-bold">RAYO15</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('login')}
                className="px-8 py-3.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                style={{ background: '#FFD400', color: '#4C1D95' }}
              >
                Quiero registrarme
              </button>
              <button
                onClick={() => navigate('login')}
                className="px-8 py-3.5 rounded-full text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-all"
              >
                Ver tiendas
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="RayoExpress" className="w-8 h-8 object-contain rounded-lg" />
                <span className="font-bold text-lg text-white">RayoExpress</span>
              </div>
              <p className="text-sm leading-relaxed">
                La forma más rápida de pedir lo que necesitas. Entrega en minutos en tu ciudad.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Descubre</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('login')} className="block hover:text-white transition-colors">Ofertas</button>
                <button onClick={() => navigate('login')} className="block hover:text-white transition-colors">Restaurantes</button>
                <button onClick={() => navigate('login')} className="block hover:text-white transition-colors">Supermercados</button>
                <button onClick={() => navigate('login')} className="block hover:text-white transition-colors">Farmacias</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Compañía</h4>
              <div className="space-y-2 text-sm">
                <button className="block hover:text-white transition-colors">Sobre nosotros</button>
                <button className="block hover:text-white transition-colors">Trabaja con nosotros</button>
                <button className="block hover:text-white transition-colors">Ser socio</button>
                <button className="block hover:text-white transition-colors">Prensa</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Soporte</h4>
              <div className="space-y-2 text-sm">
                <button className="block hover:text-white transition-colors">Ayuda</button>
                <button className="block hover:text-white transition-colors">Términos</button>
                <button className="block hover:text-white transition-colors">Privacidad</button>
                <button className="block hover:text-white transition-colors">Contacto</button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">© 2026 RayoExpress. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('login')} className="text-xs hover:text-white transition-colors">Términos</button>
              <button onClick={() => navigate('login')} className="text-xs hover:text-white transition-colors">Privacidad</button>
              <button onClick={() => navigate('login')} className="text-xs hover:text-white transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
