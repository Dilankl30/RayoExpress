import { useState } from 'react';
import { ArrowLeft, MapPin, MoreVertical } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { customerStorage } from './customerLocalState';

export function AddressesScreen() {
  const { navigate } = useAuth();
  const [addresses, setAddresses] = useState(customerStorage.getAddresses());
  const [showDialog, setShowDialog] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState('');

  const addAddress = () => {
    if (!newAddressInput.trim()) return;
    const next = [...addresses, { id: String(Date.now()), title: 'Direccion guardada', line1: newAddressInput.trim(), details: '' }];
    setAddresses(next);
    customerStorage.setAddresses(next);
    setNewAddressInput('');
    setShowDialog(false);
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-10 pb-28">
      <header className="flex items-center mb-10">
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={24} /></button>
        <h1 className="flex-1 text-center text-2xl font-bold text-[#12001f] pr-10">Direcciones</h1>
      </header>
      <h2 className="text-2xl font-bold text-[#12001f] mb-6">Direccion de entrega actual</h2>
      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No tienes direcciones guardadas</p>
          <p className="text-gray-400 text-xs mt-1">Agrega una para empezar a recibir pedidos</p>
        </div>
      ) : (
        <div className="space-y-5">
          {addresses.map((address) => (
            <article key={address.id} className="flex gap-4">
              <MapPin size={26} className="mt-1 text-[#12001f]" />
              <div className="flex-1">
                <h3 className="text-lg text-[#12001f]">{address.line1}</h3>
                <p className="text-gray-500">{address.details}</p>
              </div>
              <button aria-label="Opciones"><MoreVertical size={24} /></button>
            </article>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setShowDialog(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-[#12001f] mb-4">Nueva direccion</p>
            <input
              aria-label="Nueva direccion"
              value={newAddressInput}
              onChange={(e) => setNewAddressInput(e.target.value)}
              placeholder="Calle, numero, referencia"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#E90057] mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500">
                Cancelar
              </button>
              <button onClick={addAddress} className="flex-1 py-3 rounded-2xl bg-[#E90057] text-white text-sm font-bold">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-0 px-4 pb-7 pt-4 bg-gradient-to-t from-white via-white to-white/0">
        <button onClick={() => setShowDialog(true)} className="w-full py-4 rounded-full bg-[#E90057] text-white font-bold">Agregar direccion</button>
      </div>
    </div>
  );
}
