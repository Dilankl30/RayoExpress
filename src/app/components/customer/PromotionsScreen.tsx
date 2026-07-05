import { CreditCard, Percent, ShoppingBasket, Utensils } from 'lucide-react';

export function PromotionsScreen() {
  return (
    <div className="min-h-screen bg-white px-4 pt-12 pb-24">
      <h1 className="text-center text-2xl font-bold text-[#12001f] mb-10">Promociones</h1>
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Restaurantes', Utensils],
          ['Mercados', ShoppingBasket],
          ['Medios de pago', CreditCard],
        ].map(([label, Icon]) => (
          <button key={label as string} className="rounded-2xl bg-[#F3F3F5] py-6 flex flex-col items-center gap-3">
            <Icon size={24} /><span className="text-sm">{label as string}</span>
          </button>
        ))}
      </div>
      <h2 className="text-2xl font-bold text-[#12001f] mt-10 mb-6">Descubre las promos mas buscadas</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {['Combo familiar', 'Hamburguesas', 'Super ahorro'].map((title, index) => (
          <article key={title} className="min-w-[260px] rounded-2xl bg-gray-100 overflow-hidden">
            <div className="h-28 bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center text-5xl">{index === 0 ? '🍗' : index === 1 ? '🍔' : '🛒'}</div>
            <div className="p-4">
              <span className="inline-flex rounded-md bg-[#FFE943] px-2 py-1 text-xs font-bold">Hasta 36% DSCTO</span>
              <h3 className="font-bold mt-3 text-[#12001f]">{title}</h3>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-4 rounded-[28px] bg-[#E90057] p-5 text-[#12001f]">
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center gap-2 font-bold"><Percent size={18} /> Promocion destacada</div>
          <h2 className="text-2xl font-bold mt-3">Ahorra hoy con cupones activos</h2>
          <p className="text-gray-600 mt-2">Usa RAYO15 o RAYO1 en checkout para aplicar descuentos demo.</p>
          <button className="mt-5 font-bold">Ir a todas las promociones</button>
        </div>
      </section>
    </div>
  );
}
