import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, LocateFixed, MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getAddresses, markDefaultAddress, removeAddress } from '../../../modules/client/application/client-service';
import type { Address } from '../../../shared/types';
import { ADDRESS_UPDATED_EVENT, LocationDialog } from './LocationDialog';

export function AddressesScreen() {
  const { navigate, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadAddresses();
  }, [user]);

  const publishAddresses = (items: Address[]) => {
    setAddresses(items);
    window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: items }));
  };

  const loadAddresses = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAddresses(user.id);
      setAddresses(data);
    } catch {
      setLoadError('No pudimos cargar tus direcciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!user) return;
    try {
      publishAddresses(await removeAddress(user.id, id));
    } catch {
      setLoadError('No pudimos eliminar esa dirección.');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      publishAddresses(await markDefaultAddress(user.id, id));
    } catch {
      setLoadError('No pudimos cambiar tu dirección principal.');
    }
  };

  const defaultAddress = addresses.find((address) => address.is_default);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && addresses.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-card rounded-3xl p-6 shadow-sm">
          <MapPin size={44} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
          <p className="text-text-primary font-bold mb-1">No pudimos cargar tus direcciones</p>
          <p className="text-sm text-text-secondary mb-4">{loadError}</p>
          <button onClick={loadAddresses} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 lg:pb-10">
      <div className="lg:hidden pt-10 pb-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Direcciones</h2>
      </div>

      <main className="px-4 lg:px-6 lg:pt-8 max-w-5xl mx-auto">
        <div className="hidden lg:flex items-end justify-between mb-6">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Ubicación</p>
            <h1 className="text-3xl font-black text-text-primary">Mis direcciones</h1>
            <p className="text-text-secondary mt-1">Elige dónde recibir tus pedidos o registra una nueva ubicación.</p>
          </div>
          <button
            onClick={() => setShowLocationDialog(true)}
            className="px-5 py-3 rounded-2xl text-white font-bold flex items-center gap-2 shadow-sm"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <Plus size={18} />
            Agregar dirección
          </button>
        </div>

        {loadError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        {defaultAddress && (
          <section className="bg-card rounded-3xl p-5 lg:p-6 shadow-sm border border-brand-light mt-4 lg:mt-0 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
                <LocateFixed size={22} style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
                  Principal
                </span>
                <p className="text-text-primary font-bold text-lg mt-2 truncate">{defaultAddress.line1}</p>
                <p className="text-sm text-text-secondary mt-0.5">{defaultAddress.details || defaultAddress.title}</p>
              </div>
            </div>
          </section>
        )}

        {addresses.length === 0 ? (
          <div className="py-20 text-center bg-card rounded-3xl shadow-sm mt-4">
            <MapPin size={52} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
            <p className="font-bold text-text-primary">No tienes direcciones guardadas</p>
            <p className="text-sm text-text-secondary mt-1">Agrega una para empezar a recibir pedidos.</p>
            <button
              onClick={() => setShowLocationDialog(true)}
              className="mt-5 px-6 py-3 rounded-2xl text-white font-bold inline-flex items-center gap-2"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <Plus size={18} />
              Agregar dirección
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {addresses.map((address, index) => (
              <motion.div
                key={address.id}
                className="bg-card rounded-3xl p-4 lg:p-5 shadow-sm border border-border-light"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="flex items-start gap-3">
                  <MapPin size={21} className="mt-0.5 flex-shrink-0" style={{ color: address.is_default ? 'var(--brand)' : '#9CA3AF' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-bold truncate">{address.line1}</p>
                    <p className="text-sm text-text-secondary truncate">{address.details || address.title}</p>
                    {address.lat != null && address.lng != null && (
                      <p className="text-xs text-text-secondary mt-1">GPS: {address.lat}, {address.lng}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface hover:bg-brand-light transition-colors"
                        aria-label="Marcar como principal"
                      >
                        <Check size={15} className="text-text-secondary" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(address.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                      aria-label="Eliminar dirección"
                    >
                      <Trash2 size={15} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </section>
        )}
      </main>

      <div className="lg:hidden fixed left-0 right-0 bottom-0 px-4 pb-7 pt-4 bg-gradient-to-t from-surface via-surface to-transparent">
        <button
          onClick={() => setShowLocationDialog(true)}
          className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Plus size={18} /> Agregar dirección
        </button>
      </div>

      <LocationDialog
        open={showLocationDialog}
        userId={user.id}
        onClose={() => setShowLocationDialog(false)}
        onSaved={publishAddresses}
      />
    </div>
  );
}
