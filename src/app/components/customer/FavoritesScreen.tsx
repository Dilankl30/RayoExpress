import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { customerStorage } from './customerLocalState';

export function FavoritesScreen() {
  const { navigate } = useAuth();
  const [tab, setTab] = useState<'store' | 'product'>('store');
  const favorites = customerStorage.getFavorites().filter((item) => item.kind === tab);

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="px-4 pt-10 pb-4 flex items-center">
        <button onClick={() => navigate('profile')} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={24} /></button>
        <h1 className="flex-1 text-center text-2xl font-bold text-[#12001f] pr-10">Favoritos</h1>
      </header>
      <div className="grid grid-cols-2 text-center text-xl font-bold text-[#12001f]">
        <button onClick={() => setTab('store')} className={`py-5 border-b-4 ${tab === 'store' ? 'border-[#12001f]' : 'border-transparent text-gray-400'}`}>Locales</button>
        <button onClick={() => setTab('product')} className={`py-5 border-b-4 ${tab === 'product' ? 'border-[#12001f]' : 'border-transparent text-gray-400'}`}>Productos</button>
      </div>
      {favorites.length === 0 ? (
        <div className="min-h-[65vh] px-8 flex flex-col items-center justify-center text-center">
          <div className="text-7xl mb-6">🏪</div>
          <h2 className="text-2xl font-bold text-[#12001f]">Aun no tienes favoritos</h2>
          <p className="text-gray-500 mt-3">Agrega lugares y productos para encontrarlos mas rapido aqui.</p>
          <button onClick={() => navigate('home')} className="mt-7 px-8 py-3 rounded-full bg-[#E90057] text-white font-bold">Buscar productos</button>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-4">
          {favorites.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="text-4xl w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">{item.emoji}</div>
              <div className="flex-1">
                <h2 className="font-bold text-[#12001f]">{item.name}</h2>
                <p className="text-gray-500 text-sm">{item.subtitle}</p>
              </div>
              {item.price && <strong>${item.price.toFixed(2)}</strong>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
