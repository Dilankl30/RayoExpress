import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Loader2, LocateFixed, MapPin, Plus, Search, X } from 'lucide-react';
import {
  createAddress,
  getAddresses,
  markDefaultAddress,
} from '../../../modules/client/application/client-service';
import type { Address } from '../../../shared/types';

export const ADDRESS_UPDATED_EVENT = 'rayoexpress:address-updated';

interface LocationDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSaved?: (addresses: Address[]) => void;
}

function emitAddressUpdated(addresses: Address[]) {
  window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: addresses }));
}

function parseCoordinate(value: string, min: number, max: number): number | undefined {
  const cleanValue = value.trim().replace(',', '.');
  if (!cleanValue) return undefined;
  const coordinate = Number(cleanValue);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) return Number.NaN;
  return Number(coordinate.toFixed(6));
}

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'El navegador bloqueó el GPS. Activa el permiso de ubicación o guarda la dirección manualmente.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'No pudimos detectar tu ubicación actual. Revisa el GPS o escribe la dirección manual.';
  }
  if (error.code === error.TIMEOUT) {
    return 'La ubicación tardó demasiado. Intenta otra vez o escribe la dirección manual.';
  }
  return 'No pudimos obtener tu ubicación actual. Puedes guardar la dirección manualmente.';
}

export function LocationDialog({ open, userId, onClose, onSaved }: LocationDialogProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [title, setTitle] = useState('');
  const [line1, setLine1] = useState('');
  const [details, setDetails] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  const defaultAddress = useMemo(() => addresses.find((address) => address.is_default), [addresses]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    getAddresses(userId)
      .then((data) => {
        if (active) setAddresses(data);
      })
      .catch(() => {
        if (active) setError('No pudimos cargar tus direcciones.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, userId]);

  const publishAddresses = (items: Address[]) => {
    setAddresses(items);
    onSaved?.(items);
    emitAddressUpdated(items);
  };

  const handleSelectAddress = async (address: Address) => {
    setSaving(true);
    setError(null);
    try {
      const next = address.is_default ? addresses : await markDefaultAddress(userId, address.id);
      publishAddresses(next);
      onClose();
    } catch {
      setError('No pudimos seleccionar esta dirección.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async () => {
    if (!line1.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const lat = parseCoordinate(manualLat, -90, 90);
      const lng = parseCoordinate(manualLng, -180, 180);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setError('Revisa las coordenadas. La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180.');
        return;
      }
      if ((lat === undefined && lng !== undefined) || (lat !== undefined && lng === undefined)) {
        setError('Ingresa latitud y longitud, o deja ambos campos vacíos.');
        return;
      }

      const next = await createAddress(userId, {
        title: title.trim() || 'Dirección guardada',
        line1: line1.trim(),
        details: details.trim(),
        is_default: true,
        ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
      });
      publishAddresses(next);
      setTitle('');
      setLine1('');
      setDetails('');
      setManualLat('');
      setManualLng('');
      onClose();
    } catch {
      setError('No pudimos guardar la dirección.');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrentLocation = async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setTitle((current) => current || 'Mi ubicación');
      setError('Este navegador no permite obtener la ubicación actual. Guarda la dirección manualmente.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const accuracy = Math.round(position.coords.accuracy);
          const next = await createAddress(userId, {
            title: 'Mi ubicación actual',
            line1: `Ubicación actual (${lat}, ${lng})`,
            details: `GPS del dispositivo - precisión aprox. ${accuracy} m`,
            is_default: true,
            lat,
            lng,
          });
          publishAddresses(next);
          onClose();
        } catch {
          setError('No pudimos guardar tu ubicación actual.');
        } finally {
          setLocating(false);
        }
      },
      (positionError) => {
        setLocating(false);
        setTitle((current) => current || 'Mi ubicación');
        setError(getLocationErrorMessage(positionError));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 flex items-end lg:items-center justify-center lg:p-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full lg:max-w-2xl bg-card rounded-t-[28px] lg:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card px-5 pt-4 pb-3 border-b border-border-light lg:px-6">
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4 lg:hidden" />
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Cerrar selector de ubicación"
              className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-text-primary"
            >
              <ArrowLeft size={18} className="lg:hidden" />
              <X size={18} className="hidden lg:block" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Ingresa tu dirección</h2>
              <p className="text-sm text-text-secondary">Usa tu ubicación actual o guarda una dirección.</p>
            </div>
          </div>
        </div>

        <div className="p-5 lg:p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCurrentLocation}
            disabled={locating || saving}
            className="w-full bg-surface rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-brand-light transition-colors disabled:opacity-60"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
              {locating ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} /> : <LocateFixed size={20} style={{ color: 'var(--brand)' }} />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-text-primary">Mi ubicación actual</p>
              <p className="text-sm text-text-secondary">Registrar con el GPS de este dispositivo.</p>
            </div>
          </button>

          <section>
            <p className="text-sm font-bold text-text-primary mb-3">Guardar una dirección manual</p>
            <div className="space-y-3">
              <input
                aria-label="Nombre de la dirección"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nombre: Casa, trabajo, local..."
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary border border-transparent focus:border-brand"
              />
              <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-2 border border-transparent focus-within:border-brand">
                <Search size={17} className="text-text-secondary" />
                <input
                  aria-label="Dirección"
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                  placeholder="Dirección o punto de referencia"
                  className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-secondary"
                />
              </div>
              <input
                aria-label="Detalles de dirección"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Departamento, referencia, instrucciones"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary border border-transparent focus:border-brand"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Latitud"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  placeholder="Latitud opcional"
                  inputMode="decimal"
                  className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary border border-transparent focus:border-brand"
                />
                <input
                  aria-label="Longitud"
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  placeholder="Longitud opcional"
                  inputMode="decimal"
                  className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary border border-transparent focus:border-brand"
                />
              </div>
              <p className="text-xs text-text-secondary">
                Las coordenadas son opcionales. Se completan automáticamente cuando usas el GPS.
              </p>
              <button
                onClick={handleSaveManual}
                disabled={!line1.trim() || saving}
                className="w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Guardar dirección
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-text-primary">Direcciones guardadas</p>
              {defaultAddress && <span className="text-xs text-text-secondary">Principal: {defaultAddress.title}</span>}
            </div>
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-2xl bg-surface p-5 text-center">
                <MapPin size={32} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
                <p className="font-medium text-text-primary">Aún no tienes direcciones</p>
                <p className="text-sm text-text-secondary mt-1">Guarda una para usarla en tus pedidos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    onClick={() => handleSelectAddress(address)}
                    className="w-full rounded-2xl bg-surface p-4 flex items-start gap-3 text-left hover:bg-brand-light transition-colors"
                  >
                    <MapPin size={19} className="mt-0.5 flex-shrink-0" style={{ color: address.is_default ? 'var(--brand)' : '#9CA3AF' }} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-text-primary truncate">{address.line1}</span>
                      <span className="block text-sm text-text-secondary truncate">{address.details || address.title}</span>
                    </span>
                    {address.is_default && <Check size={18} style={{ color: 'var(--brand)' }} />}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
