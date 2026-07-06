import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Plus, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getAddresses, createAddress, removeAddress, markDefaultAddress } from '../../../modules/client/application/client-service';
import type { Address } from '../../../shared/types';

export function AddressesScreen() {
  const { navigate, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadAddresses();
  }, [user]);

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

  const handleAdd = async () => {
    if (!newAddress.trim() || !user) return;
    setSaving(true);
    try {
      const result = await createAddress(user.id, {
        title: newTitle.trim() || 'Dirección guardada',
        line1: newAddress.trim(),
        details: '',
        is_default: addresses.length === 0,
      });
      setAddresses(result);
      setNewAddress('');
      setNewTitle('');
      setShowAdd(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!user) return;
    try {
      const result = await removeAddress(user.id, id);
      setAddresses(result);
    } catch { /* ignore */ }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      const result = await markDefaultAddress(user.id, id);
      setAddresses(result);
    } catch { /* ignore */ }
  };

  const defaultAddress = addresses.find(a => a.is_default);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <span className="text-4xl mb-3 block">😕</span>
          <p className="text-text-primary font-bold mb-1">Error</p>
          <p className="text-sm text-text-secondary mb-4">{loadError}</p>
          <button onClick={loadAddresses} className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: 'var(--brand)' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="pt-10 pb-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Direcciones</h2>
      </div>

      <div className="px-4 mt-4">
        {defaultAddress && (
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-brand-light mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} style={{ color: 'var(--brand)' }} />
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
                Principal
              </span>
            </div>
            <p className="text-text-primary font-medium">{defaultAddress.line1}</p>
            <p className="text-xs text-text-secondary mt-0.5">{defaultAddress.details || defaultAddress.title}</p>
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            <MapPin size={48} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
            <p className="font-medium">No tienes direcciones guardadas</p>
            <p className="text-sm mt-1">Agrega una para empezar a recibir pedidos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <motion.div
                key={address.id}
                className="bg-card rounded-2xl p-4 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="mt-0.5 flex-shrink-0" style={{ color: address.is_default ? 'var(--brand)' : '#9CA3AF' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">{address.line1}</p>
                    <p className="text-xs text-text-secondary">{address.details || address.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-brand-light transition-colors"
                        aria-label="Marcar como principal"
                      >
                        <Check size={14} className="text-text-secondary" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(address.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                      aria-label="Eliminar dirección"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <p className="text-lg font-bold text-text-primary mb-4">Nueva dirección</p>
            <input
              aria-label="Nombre de la dirección"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nombre (ej: Casa, Trabajo)"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary mb-3"
            />
            <input
              aria-label="Dirección"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Calle, número, referencia"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-surface text-text-secondary">
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!newAddress.trim() || saving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-0 px-4 pb-7 pt-4 bg-gradient-to-t from-surface via-surface to-transparent">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Plus size={18} /> Agregar dirección
        </button>
      </div>
    </div>
  );
}
