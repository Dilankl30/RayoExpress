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
    <div className="min-h-screen bg-card">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="RayoExpress" className="w-9 h-9 object-contain rounded-lg" />
              <span className="font-bold text-xl" style={{ color: 'var(--brand)' }}>RayoExpress</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <button className="text-text-secondary hover:text-brand font-medium transition-colors">Ofertas</button>
              <button className="text-text-secondary hover:text-brand font-medium transition-colors">Tiendas</button>
              <button className="text-text-secondary hover:text-brand font-medium transition-colors">Cómo funciona</button>
              <button className="text-text-secondary hover:text-brand font-medium transition-colors">Contacto</button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('login')}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-brand transition-colors"
              >
                <Users size={16} />
                Iniciar sesión
              </button>
              <button
                onClick={() => navigate('login')}
                className="px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
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
                 className="md:hidden pb-6 border-t border-border-light pt-3"
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
               >
                 <div className="grid grid-cols-2 gap-3 mb-6">
                   <button
                     onClick={() => navigate('login')}
                     className="px-4 py-2.5 rounded-xl text-sm font-semibold text-text-primary bg-surface border border-border-light"
                   >
                     Iniciar sesión
                   </button>
                   <button
                     onClick={() => navigate('login')}
                     className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md"
                     style={{ background: 'var(--brand)' }}
                   >
                     Registrarse
                   </button>
                 </div>
                 <div className="space-y-3">
                   <button className="block w-full text-left py-2 text-text-secondary font-medium">Ofertas</button>
                   <button className="block w-full text-left py-2 text-text-secondary font-medium">Tiendas</button>
                   <button className="block w-full text-left py-2 text-text-secondary font-medium">Cómo funciona</button>
                   <button className="block w-full text-left py-2 text-text-secondary font-medium">Contacto</button>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </nav>

       {/* ===== HERO ===== */}
       <section className="relative pt-16 pb-16 md:pt-24 md:pb-32 overflow-hidden">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand/5 to-transparent pointer-events-none" />
         <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
         
         <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
           <div className="grid md:grid-cols-2 gap-12 items-center">
             <div>
               <motion.div
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.6 }}
               >
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-dark)' }}>
                   <Sparkles size={12} />
                   SISTEMA DE ENTREGAS ULTRA RÁPIDO
                 </div>
                 <h1 className="text-4xl md:text-6xl font-extrabold text-text-primary leading-tight mb-6">
                   Todo lo que necesitas, <br />
                   <span className="text-brand">entregado en un rayo</span>
                 </h1>
                 <p className="text-lg text-text-secondary mb-10 max-w-lg leading-relaxed">
                   Conecta con las mejores tiendas de tu ciudad. Pedidos rápidos, seguros y eficientes para tu día a día.
                 </p>
 
                 <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-xl border border-border-light mb-8 max-w-lg">
                   <div className="flex items-center gap-2 flex-1 pl-3">
                     <Search size={20} className="text-text-secondary flex-shrink-0" />
                     <input
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       placeholder="Busca tu tienda o producto favorito..."
                       className="flex-1 outline-none text-text-primary placeholder:text-text-secondary text-sm bg-transparent py-3"
                     />
                   </div>
                   <button
                     type="submit"
                     className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
                     style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}
                   >
                     Buscar
                   </button>
                 </form>
 
                 <div className="flex flex-wrap gap-6 items-center">
                   <button
                     onClick={() => navigate('login')}
                     className="px-8 py-3 rounded-full text-sm font-bold shadow-lg transition-all flex items-center gap-2 hover:scale-105"
                     style={{ background: 'var(--brand)', color: 'white' }}
                   >
                     Comenzar ahora
                     <ArrowRight size={16} />
                   </button>
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                       <Shield size={14} className="text-brand" />
                       Pago Seguro
                     </div>
                     <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                       <Truck size={14} className="text-brand" />
                       Envío Rápido
                     </div>
                   </div>
                 </div>
               </motion.div>
             </div>
 
             <motion.div
               className="hidden md:flex justify-center relative"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.7, delay: 0.2 }}
             >
               <div className="relative w-full max-w-lg">
                 <div className="relative z-10 flex justify-center">
                   <div className="relative w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-brand/20 to-brand-dark/5 rounded-full flex items-center justify-center animate-pulse">
                      <div className="relative w-48 h-48 md:w-64 md:h-64 bg-white rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white">
                         <img src={logo} alt="RayoExpress" className="w-32 h-32 object-contain" />
                      </div>
                      <div className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-lg animate-bounce">
                         <Bike size={32} style={{ color: 'var(--brand)' }} />
                      </div>
                      <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-2xl shadow-lg animate-bounce" style={{ animationDelay: '1s' }}>
                         <Package size={32} style={{ color: 'var(--brand)' }} />
                      </div>
                      <div className="absolute top-1/2 -right-12 bg-white p-3 rounded-2xl shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
                         <ShoppingBag size={32} style={{ color: 'var(--brand)' }} />
                      </div>
                   </div>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand/10 rounded-full blur-3xl -z-10" />
               </div>
             </motion.div>
           </div>
         </div>
       </section>

      {/* ===== MARQUEE STRIP ===== */}
      <div className="py-3 bg-surface border-y border-border-light overflow-hidden">
        <div className="flex gap-8 animate-[scroll_30s_linear_infinite] whitespace-nowrap" style={{ animation: 'scroll 30s linear infinite' }}>
          {[...banners, ...banners].map((b, i) => (
            <span key={i} className="flex items-center gap-2 text-sm text-text-secondary">
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
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Ofertas del día</h2>
              <p className="text-text-secondary mt-1">Aprovecha estos descuentos exclusivos</p>
            </div>
            <button onClick={() => navigate('login')} className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--brand)' }}>
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
      <section className="py-12 bg-surface">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">¿Qué se te antoja?</h2>
              <p className="text-text-secondary mt-1">Explora por categorías</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {(dbCategories.length > 0 ? dbCategories : categories).map((cat, i) => (
              <motion.button
                key={cat.id || cat.name}
                onClick={() => navigate('login')}
                className="flex flex-col items-center gap-3 p-4 md:p-6 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all"
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
                <span className="text-xs md:text-sm font-medium text-text-primary text-center">{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Así de fácil funciona</h2>
            <p className="text-text-secondary mt-2">Tres pasos y tienes todo en tu puerta</p>
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
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))' }}>
                  <step.icon size={32} className="text-white" />
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: 'var(--brand)' }}>0{i + 1}</p>
                <h3 className="text-xl font-bold text-text-primary mb-2">{step.title}</h3>
                <p className="text-text-secondary max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED STORES ===== */}
      <section className="py-12 bg-surface">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Tiendas destacadas</h2>
              <p className="text-text-secondary mt-1">Las favoritas de tu zona</p>
            </div>
            <button onClick={() => navigate('login')} className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--brand)' }}>
              Ver todo <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(stores.length > 0 ? stores : featuredStores).map((store, i) => (
              <motion.button
                key={store.id || store.name}
                onClick={() => navigate('login')}
                className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
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
                <p className="font-semibold text-text-primary text-sm truncate">{store.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star size={11} fill="#FFD400" stroke="#FFD400" />
                  <span className="text-xs text-text-secondary">{store.rating || '4.5'}</span>
                  <span className="text-xs text-text-secondary mx-1">·</span>
                  <Clock size={11} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary">{store.delivery || '15-20'}</span>
                </div>
                <div className="mt-2 text-xs font-medium" style={{ color: store.fee === 0 || store.delivery_fee === 0 ? 'var(--success)' : '#6B7280' }}>
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
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Lo que dicen nuestros usuarios</h2>
            <p className="text-text-secondary mt-2">Más de 50,000 pedidos entregados con éxito</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="bg-surface rounded-2xl p-6"
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
                <p className="text-text-primary text-sm mb-3">"{t.text}"</p>
                <p className="font-semibold text-text-primary text-sm">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 50%, #1E0A3C 100%)' }}>
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
      <footer className="bg-gray-900 text-text-secondary py-12">
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
