import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, Clock, Truck, Heart, Share2, Search, Plus, Minus, ShoppingCart, Tag } from 'lucide-react';
import type { Screen, CartItem } from '../../types';

interface StoreDetailScreenProps {
  storeId: string;
  onNavigate: (screen: Screen) => void;
  onAddToCart: (item: CartItem) => void;
  cartCount: number;
}

const storeData: Record<string, {
  name: string; emoji: string; cat: string; rating: number; time: string;
  fee: string; minOrder: string; bg: string; promo: string | null;
}> = {
  '1': { name: 'Burger King', emoji: '🍔', cat: 'Restaurantes · Comida rápida', rating: 4.8, time: '25-35 min', fee: '$1.50', minOrder: '$5.00', bg: '#E55604', promo: '20% OFF en pedidos +$15' },
  '2': { name: 'KFC Ecuador', emoji: '🍗', cat: 'Restaurantes · Pollo', rating: 4.7, time: '20-30 min', fee: 'Gratis', minOrder: '$4.00', bg: '#E4002B', promo: null },
  '3': { name: 'Supermaxi Express', emoji: '🛒', cat: 'Súper · Abarrotes', rating: 4.9, time: '30-45 min', fee: '$2.00', minOrder: '$10.00', bg: '#22C55E', promo: '15% OFF primeros pedidos' },
  '4': { name: 'Farmacia Fybeca', emoji: '💊', cat: 'Farmacias · Salud', rating: 4.6, time: '15-25 min', fee: 'Gratis', minOrder: '$3.00', bg: '#3B82F6', promo: null },
  '5': { name: 'Pizza Hut', emoji: '🍕', cat: 'Restaurantes · Pizzas', rating: 4.5, time: '35-45 min', fee: '$1.00', minOrder: '$6.00', bg: '#CC0000', promo: '2x1 los martes' },
  '6': { name: 'Subway', emoji: '🥪', cat: 'Restaurantes · Subs', rating: 4.6, time: '20-30 min', fee: 'Gratis', minOrder: '$5.00', bg: '#00703C', promo: null },
};

const menuCategories = ['Todo', 'Combos', 'Populares', 'Especialidades', 'Bebidas', 'Postres'];

const menuItems: Record<string, { id: string; name: string; desc: string; price: number; emoji: string; category: string; badge?: string }[]> = {
  default: [
    { id: 'p1', name: 'Combo Whopper', desc: 'Whopper + papas + bebida L', price: 8.99, emoji: '🍔', category: 'Combos', badge: 'Popular' },
    { id: 'p2', name: 'Whopper Doble', desc: 'Doble carne, queso, vegetales frescos', price: 7.50, emoji: '🍔', category: 'Especialidades' },
    { id: 'p3', name: 'Papas Grandes', desc: 'Crujientes, recién fritas', price: 2.99, emoji: '🍟', category: 'Especialidades' },
    { id: 'p4', name: 'Onion Rings', desc: 'Anillos de cebolla empanizados', price: 3.49, emoji: '🧅', category: 'Especialidades' },
    { id: 'p5', name: 'Combo Doble BK', desc: '2 hamburguesas + papas + bebidas', price: 14.99, emoji: '🍔', category: 'Combos', badge: 'Oferta' },
    { id: 'p6', name: 'Coca-Cola 500ml', desc: 'Bebida refrescante', price: 1.99, emoji: '🥤', category: 'Bebidas' },
    { id: 'p7', name: 'Sundae Oreo', desc: 'Helado suave con galleta Oreo', price: 2.49, emoji: '🍦', category: 'Postres' },
    { id: 'p8', name: 'Nuggets x6', desc: 'Trocitos de pollo crujiente', price: 4.99, emoji: '🍗', category: 'Populares', badge: 'Popular' },
  ],
};

export function StoreDetailScreen({ storeId, onNavigate, onAddToCart, cartCount }: StoreDetailScreenProps) {
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState(false);

  const store = storeData[storeId] || storeData['1'];
  const items = menuItems.default;

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === 'Todo' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getQty = (id: string) => quantities[id] || 0;

  const increment = (item: typeof items[0]) => {
    const newQty = getQty(item.id) + 1;
    setQuantities((prev) => ({ ...prev, [item.id]: newQty }));
    onAddToCart({ id: item.id, name: item.name, price: item.price, quantity: 1, emoji: item.emoji });
  };

  const decrement = (id: string) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  };

  const totalInCart = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Store Banner */}
      <div
        className="relative h-48 flex items-end"
        style={{ backgroundColor: store.bg }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 80 }}>{store.emoji}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Header buttons */}
        <div className="absolute top-10 left-0 right-0 flex items-center justify-between px-4">
          <button
            onClick={() => onNavigate('home')}
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
            <button className="relative" onClick={() => onNavigate('cart')}>
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

        {/* Promo badge */}
        {store.promo && (
          <div className="absolute top-12 left-4">
            <span
              className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
              style={{ backgroundColor: '#FFD400', color: '#4C1D95' }}
            >
              <Tag size={11} />
              {store.promo}
            </span>
          </div>
        )}
      </div>

      {/* Store Info Card */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <h2 className="text-gray-900 mb-1">{store.name}</h2>
        <p className="text-sm text-gray-500 mb-3">{store.cat}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Star size={14} fill="#FFD400" stroke="#FFD400" />
            <strong>{store.rating}</strong>
            <span className="text-gray-400">(432)</span>
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <Clock size={14} />
            {store.time}
          </span>
          <span
            className="flex items-center gap-1 text-sm"
            style={{ color: store.fee === 'Gratis' ? '#22C55E' : '#6B7280' }}
          >
            <Truck size={14} />
            Envío {store.fee}
          </span>
          <span className="text-sm text-gray-500">Mínimo {store.minOrder}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <div className="bg-gray-100 rounded-xl flex items-center gap-2 px-3 py-2.5">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el menú..."
            className="flex-1 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {menuCategories.map((cat) => (
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

      {/* Menu Items */}
      <div className="px-4 py-4 pb-32">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">🍽️</p>
            <p>No hay productos en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
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
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-gray-900 font-medium flex-1">{item.name}</p>
                    {item.badge && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{
                          backgroundColor: item.badge === 'Popular' ? '#FEF3C7' : '#FDF2F8',
                          color: item.badge === 'Popular' ? '#D97706' : '#DB2777',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.desc}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold" style={{ color: '#6D28D9' }}>${item.price.toFixed(2)}</p>
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

      {/* Bottom CTA */}
      {totalInCart > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 max-w-md mx-auto"
          style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <button
            onClick={() => onNavigate('cart')}
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
              ${filtered.reduce((acc, item) => acc + item.price * getQty(item.id), 0).toFixed(2)}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
