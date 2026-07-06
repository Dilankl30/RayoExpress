import { ArrowLeft, Eye, Users } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';

export function WalletScreen() {
  const { navigate } = useAuth();
  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="bg-[#E90057] px-4 pt-10 pb-14 rounded-b-[32px]">
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-12 h-12 rounded-full bg-white flex items-center justify-center"><ArrowLeft size={24} /></button>
        <section className="bg-white rounded-[28px] text-center mt-8 py-8">
          <h1 className="text-2xl font-bold text-[#12001f]">Saldo</h1>
          <div className="flex items-center justify-center gap-3 mt-3 text-[#12001f]">
            <span className="text-3xl">$</span><strong className="text-7xl leading-none">0</strong><Eye size={30} />
          </div>
        </section>
      </div>
      <div className="px-4 -mt-8">
        <button className="w-full rounded-2xl bg-[#F3F3F5] p-5 flex items-center gap-4 text-left">
          <span className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center"><Users size={24} /></span>
          <span className="flex-1"><strong className="block text-[#12001f]">Grupo familiar</strong><span className="text-gray-500">Crea un grupo y empieza a enviar o recibir saldo para hacer pedidos.</span></span>
        </button>
        <section className="text-center py-14">
          <div className="text-5xl mb-5">▭</div>
          <h2 className="text-2xl font-bold text-[#12001f]">No tienes movimientos</h2>
          <p className="text-gray-500 mt-3">Aqui encontraras los movimientos de tus pedidos y el saldo que recibas o uses.</p>
        </section>
      </div>
    </div>
  );
}
