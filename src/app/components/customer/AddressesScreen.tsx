import { useState } from 'react';
import { ArrowLeft, MapPin, MoreVertical } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { customerStorage } from './customerLocalState';

export function AddressesScreen() {
  const { navigate } = useAuth();
  const [addresses, setAddresses] = useState(customerStorage.getAddresses());

  const addAddress = () => {
    const line1 = window.prompt('Direccion de entrega');
    if (!line1) return;
    const next = [...addresses, { id: String(Date.now()), title: 'Direccion guardada', line1, details: '' }];
    setAddresses(next);
    customerStorage.setAddresses(next);
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-10 pb-28">
      <header className="flex items-center mb-10">
        <button onClick={() => navigate('profile')} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={24} /></button>
        <h1 className="flex-1 text-center text-2xl font-bold text-[#12001f] pr-10">Direcciones</h1>
      </header>
      <h2 className="text-2xl font-bold text-[#12001f] mb-6">Direccion de entrega actual</h2>
      <div className="space-y-5">
        {addresses.map((address) => (
          <article key={address.id} className="flex gap-4">
            <MapPin size={26} className="mt-1 text-[#12001f]" />
            <div className="flex-1">
              <h3 className="text-lg text-[#12001f]">{address.line1}</h3>
              <p className="text-gray-500">{address.details}</p>
            </div>
            <button><MoreVertical size={24} /></button>
          </article>
        ))}
      </div>
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-7 pt-4 bg-gradient-to-t from-white via-white to-white/0">
        <button onClick={addAddress} className="w-full py-4 rounded-full bg-[#E90057] text-white font-bold">Agregar direccion</button>
      </div>
    </div>
  );
}
