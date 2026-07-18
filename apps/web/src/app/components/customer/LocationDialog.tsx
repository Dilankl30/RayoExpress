import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { Circle, MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  createAddress,
  getAddresses,
  markDefaultAddress,
  MAX_CUSTOMER_ADDRESSES,
} from '../../../modules/client/application/client-service';
import { detectCityCached } from '../../../shared/lib/city';
import type { Address } from '../../../shared/types';
import { getSupabase } from '../../../integrations/supabase/client';
import {
  getActiveCoverageZone,
  isPointInAnyCoverageZone,
  parseCoverageAreaConfig,
  parseCoverageZonesConfig,
  type CoverageAreaConfig,
  type CoverageZoneConfig,
  type CoverageZonesConfig,
} from '../../../shared/utils/coverage-area';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [-0.4632, -76.9892];

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'El navegador bloqueó el GPS. Activa el permiso de ubicación o selecciona un punto en el mapa.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'No pudimos detectar tu ubicación actual. Revisa el GPS o selecciona un punto en el mapa.';
  }
  if (error.code === error.TIMEOUT) {
    return 'La ubicación tardó demasiado. Intenta otra vez o selecciona un punto en el mapa.';
  }
  return 'No pudimos obtener tu ubicación actual. Puedes seleccionar un punto en el mapa.';
}

function zoneFromLegacy(area: CoverageAreaConfig | null): CoverageZoneConfig | null {
  if (!area) return null;
  return {
    id: 'legacy',
    city_name: area.city_name,
    center: area.center,
    radius_km: area.radius_km,
    is_active: true,
    shape: 'circle',
    boundary: [],
  };
}

export function LocationDialog({ open, userId, onClose, onSaved }: LocationDialogProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapPickLat, setMapPickLat] = useState<number | null>(null);
  const [mapPickLng, setMapPickLng] = useState<number | null>(null);
  const mapCenter = useRef<[number, number]>(DEFAULT_CENTER);
  const [coverageArea, setCoverageArea] = useState<CoverageAreaConfig | null>(null);
  const [coverageZones, setCoverageZones] = useState<CoverageZonesConfig | null>(null);

  const defaultAddress = useMemo(() => addresses.find((address) => address.is_default), [addresses]);
  const canSaveMore = addresses.length < MAX_CUSTOMER_ADDRESSES;
  const addressLimitMessage = `Solo puedes guardar hasta ${MAX_CUSTOMER_ADDRESSES} ubicaciones. Elimina una para registrar otra.`;
  const activeZone = useMemo(
    () => getActiveCoverageZone(coverageZones) ?? zoneFromLegacy(coverageArea),
    [coverageArea, coverageZones],
  );

  useEffect(() => {
    const loadCoverage = async () => {
      try {
        const supabase = getSupabase();
        const { data: zonesData } = await supabase.from('app_config').select('*').eq('key', 'coverage_zones').maybeSingle();
        const zones = parseCoverageZonesConfig(zonesData?.value);
        if (zones) {
          setCoverageZones(zones);
          const active = getActiveCoverageZone(zones);
          if (active && mapPickLat === null) mapCenter.current = active.center;
          return;
        }

        const { data } = await supabase.from('app_config').select('*').eq('key', 'coverage_area').maybeSingle();
        const legacy = parseCoverageAreaConfig(data?.value);
        if (legacy) {
          setCoverageArea(legacy);
          if (mapPickLat === null) mapCenter.current = legacy.center;
        }
      } catch {
        // Coverage is optional while the app is being configured.
      }
    };
    void loadCoverage();
  }, [mapPickLat]);

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

  const checkCoordinatesInCoverage = (lat: number, lng: number): { inside: boolean; msg?: string } => {
    if (coverageZones) {
      const result = isPointInAnyCoverageZone(lat, lng, coverageZones);
      if (!result.inside) {
        const city = result.zone?.city_name ?? 'la zona activa';
        return {
          inside: false,
          msg: `Esta ubicación está fuera de la cobertura de RayoExpress para ${city}.`,
        };
      }
      return { inside: true };
    }

    if (!coverageArea) return { inside: true };

    const result = isPointInAnyCoverageZone(lat, lng, {
      version: 2,
      active_city_id: 'legacy',
      cities: [{
        id: 'legacy',
        city_name: coverageArea.city_name,
        center: coverageArea.center,
        radius_km: coverageArea.radius_km,
        is_active: true,
      }],
    });

    if (!result.inside) {
      return {
        inside: false,
        msg: `Esta ubicación está fuera de la zona de cobertura de RayoExpress (${coverageArea.radius_km} km en ${coverageArea.city_name}).`,
      };
    }
    return { inside: true };
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

  const handleMapPick = useCallback((lat: number, lng: number) => {
    setMapPickLat(Number(lat.toFixed(6)));
    setMapPickLng(Number(lng.toFixed(6)));
    mapCenter.current = [lat, lng];
    setError(null);
  }, []);

  const handleSaveMapPoint = async () => {
    if (mapPickLat === null || mapPickLng === null) {
      setError('Selecciona un punto en el mapa.');
      return;
    }
    if (!canSaveMore) {
      setError(addressLimitMessage);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const check = checkCoordinatesInCoverage(mapPickLat, mapPickLng);
      if (!check.inside) {
        setError(check.msg || 'Ubicación fuera de la zona de cobertura.');
        return;
      }

      const city = await detectCityCached(mapPickLat, mapPickLng);
      const label = city || activeZone?.city_name || 'Punto seleccionado';
      const next = await createAddress(userId, {
        title: 'Ubicación seleccionada',
        line1: `${label} (${mapPickLat.toFixed(6)}, ${mapPickLng.toFixed(6)})`,
        details: 'Seleccionada en el mapa',
        is_default: true,
        lat: mapPickLat,
        lng: mapPickLng,
      });
      publishAddresses(next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar la ubicación seleccionada.');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrentLocation = async () => {
    setError(null);
    if (!canSaveMore) {
      setError(addressLimitMessage);
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Este navegador no permite obtener la ubicación actual. Selecciona un punto en el mapa.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const accuracy = Math.round(position.coords.accuracy);
          const city = await detectCityCached(lat, lng);
          const check = checkCoordinatesInCoverage(lat, lng);
          if (!check.inside) {
            setError(check.msg || 'Ubicación fuera de la zona de cobertura.');
            setLocating(false);
            return;
          }

          const next = await createAddress(userId, {
            title: 'Mi ubicación actual',
            line1: city ? `${city} (${lat}, ${lng})` : `Ubicación actual (${lat}, ${lng})`,
            details: `GPS del dispositivo - precisión aprox. ${accuracy} m`,
            is_default: true,
            lat,
            lng,
          });
          publishAddresses(next);
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pudimos guardar tu ubicación actual.');
        } finally {
          setLocating(false);
        }
      },
      (positionError) => {
        setLocating(false);
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
              <p className="text-sm text-text-secondary">Usa tu ubicación actual o selecciona un punto en el mapa.</p>
              <p className="text-xs text-text-secondary mt-1">{addresses.length}/{MAX_CUSTOMER_ADDRESSES} ubicaciones guardadas</p>
            </div>
          </div>
        </div>

        <div className="p-5 lg:p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {!canSaveMore && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {addressLimitMessage}
            </div>
          )}

          <button
            onClick={handleCurrentLocation}
            disabled={locating || saving || !canSaveMore}
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

          <button
            onClick={() => { setShowMap(!showMap); if (!showMap) setError(null); }}
            className="w-full bg-surface rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-brand-light transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: mapPickLat ? '#F0FDF4' : 'var(--brand-light)' }}>
              <MapPin size={20} style={{ color: mapPickLat ? '#22C55E' : 'var(--brand)' }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-text-primary">Seleccionar en el mapa</p>
              <p className="text-sm text-text-secondary">{mapPickLat ? `${mapPickLat.toFixed(4)}, ${mapPickLng?.toFixed(4)}` : 'Elige un punto en el mapa como dirección.'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: showMap ? 'var(--brand-light)' : '#F3F4F6', color: showMap ? 'var(--brand)' : '#9CA3AF' }}>
              {showMap ? 'Cerrar' : 'Abrir'}
            </span>
          </button>

          {showMap && (
            <div className="space-y-3">
              <div className="rayo-map-frame relative rounded-2xl overflow-hidden border border-border-light shadow-xl" style={{ height: 300 }}>
                <MapContainer center={mapCenter.current} zoom={activeZone ? 13 : 15} className="h-full w-full" scrollWheelZoom>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <LocationPicker onPick={handleMapPick} />
                  {activeZone?.shape === 'polygon' && activeZone.boundary && activeZone.boundary.length >= 3 ? (
                    <Polygon positions={activeZone.boundary} pathOptions={{ color: '#6D28D9', fillColor: '#A855F7', fillOpacity: 0.16 }} />
                  ) : activeZone ? (
                    <Circle center={activeZone.center} radius={Math.max(activeZone.radius_km, 0.5) * 1000} pathOptions={{ color: '#6D28D9', fillColor: '#A855F7', fillOpacity: 0.14 }} />
                  ) : null}
                  {mapPickLat && mapPickLng && <Marker position={[mapPickLat, mapPickLng]} />}
                </MapContainer>
                <div className="pointer-events-none absolute inset-0 z-[900] rounded-2xl ring-2 ring-white/80 shadow-[inset_0_0_0_1px_rgba(109,40,217,0.18)]" />
                <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text-primary shadow">
                  Toca el mapa para elegir tu punto
                </div>
              </div>
              <button
                onClick={handleSaveMapPoint}
                disabled={saving || mapPickLat === null || mapPickLng === null || !canSaveMore}
                className="w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                Guardar punto seleccionado
              </button>
            </div>
          )}

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
