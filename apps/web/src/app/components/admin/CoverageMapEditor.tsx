import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CircleDashed, MapPinned, PencilLine, Trash2, Undo2 } from 'lucide-react';

export interface CoverageCityDraft {
  id: string;
  city_name: string;
  center: [number, number];
  radius_km: number;
  is_active: boolean;
  shape: 'circle' | 'polygon';
  boundary: [number, number][];
}

export interface CoverageStorePoint {
  id: string;
  name: string;
  emoji: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  is_open: boolean;
  inside?: boolean;
  distanceLabel?: string;
  zoneRadiusKm?: number | null;
}

const DEFAULT_CENTER: [number, number] = [-0.4632, -76.9892];

const leafletIcon = new L.Icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function getCenterForPolygon(points: [number, number][]): [number, number] {
  if (points.length === 0) return DEFAULT_CENTER;
  if (points.length === 1) return points[0];
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function getCircleBounds(city: CoverageCityDraft) {
  return L.circle(city.center, { radius: Math.max(city.radius_km, 0.5) * 1000 }).getBounds();
}

function ZoneViewport({ city, stores }: { city: CoverageCityDraft; stores: CoverageStorePoint[] }) {
  const map = useMap();

  useEffect(() => {
    const storePoints = stores
      .filter((store) => typeof store.latitude === 'number' && typeof store.longitude === 'number')
      .map((store) => [store.latitude as number, store.longitude as number] as [number, number]);

    if (storePoints.length > 0) {
      const bounds = L.latLngBounds(storePoints);

      if (city.shape === 'polygon' && city.boundary.length >= 2) {
        bounds.extend(city.boundary as [number, number][]);
      } else {
        bounds.extend(getCircleBounds(city));
      }

      map.fitBounds(bounds.pad(0.22), { animate: false });
      return;
    }

    if (city.shape === 'polygon' && city.boundary.length >= 2) {
      const bounds = L.latLngBounds(city.boundary.map((point) => [point[0], point[1]] as [number, number]));
      map.fitBounds(bounds.pad(0.25), { animate: false });
      return;
    }

    map.setView(city.center, city.boundary.length > 0 ? 13 : 12, { animate: false });
  }, [city, map]);

  return null;
}

function createStoreIcon(store: CoverageStorePoint) {
  const inside = store.inside ?? false;
  const isOpen = store.is_open;
  const accent = inside ? '#22C55E' : '#F59E0B';
  const accentDark = inside ? '#15803D' : '#B45309';
  const emoji = store.emoji || '🏬';
  const badge = isOpen ? 'Abierta' : 'Cerrada';

  return L.divIcon({
    className: '',
    iconSize: [58, 70],
    iconAnchor: [29, 58],
    popupAnchor: [0, -50],
    html: `
      <div class="relative w-[58px] h-[70px]">
        <div class="radar-pulse-ring" style="position:absolute; inset:8px; background-color: rgba(${inside ? '34,197,94' : '245,158,11'}, 0.22);"></div>
        <div class="radar-pulse-ring-2" style="position:absolute; inset:8px; background-color: rgba(${inside ? '34,197,94' : '245,158,11'}, 0.16);"></div>
        <div class="absolute left-1/2 top-1.5 flex h-[44px] w-[44px] -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white shadow-lg" style="background:${accent}; box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);">
          <span style="font-size: 19px; line-height: 1;">${emoji}</span>
        </div>
        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow" style="background:${accentDark};">
          ${badge}
        </div>
      </div>
    `,
  });
}

function MapClickLayer({
  city,
  onChange,
}: {
  city: CoverageCityDraft;
  onChange: (patch: Partial<CoverageCityDraft>) => void;
}) {
  useMapEvents({
    click(e) {
      const nextPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      if (city.shape === 'polygon') {
        onChange({ boundary: [...city.boundary, nextPoint] });
        return;
      }
      onChange({ center: nextPoint });
    },
  });

  return null;
}

export function CoverageMapEditor({
  city,
  onChange,
  stores = [],
}: {
  city: CoverageCityDraft | null;
  onChange: (patch: Partial<CoverageCityDraft>) => void;
  stores?: CoverageStorePoint[];
}) {
  const center = useMemo(() => {
    if (!city) return DEFAULT_CENTER;
    if (city.shape === 'polygon' && city.boundary.length > 0) return getCenterForPolygon(city.boundary);
    return city.center;
  }, [city]);

  if (!city) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-surface p-6 text-sm text-text-secondary">
        Selecciona una ciudad para dibujar su cobertura.
      </div>
    );
  }

  const polygonPoints = city.boundary.length >= 3 ? city.boundary : [];
  const polylinePoints = city.boundary.length >= 2 ? city.boundary : [];
  const storesWithCoords = stores.filter((store) => typeof store.latitude === 'number' && typeof store.longitude === 'number');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ shape: 'circle', boundary: [] })}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${city.shape === 'circle' ? 'border-brand bg-brand text-white' : 'border-border-light bg-surface text-text-secondary'}`}
        >
          <CircleDashed size={14} />
          Radio
        </button>
        <button
          type="button"
          onClick={() => onChange({ shape: 'polygon' })}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${city.shape === 'polygon' ? 'border-brand bg-brand text-white' : 'border-border-light bg-surface text-text-secondary'}`}
        >
          <PencilLine size={14} />
          Poligono
        </button>
        <button
          type="button"
          onClick={() => onChange({ boundary: city.boundary.slice(0, -1) })}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-border-light bg-surface text-text-secondary"
        >
          <Undo2 size={14} />
          Deshacer punto
        </button>
        <button
          type="button"
          onClick={() => onChange({ boundary: [] })}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-border-light bg-surface text-text-secondary"
        >
          <Trash2 size={14} />
          Limpiar
        </button>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand">
          <MapPinned size={14} />
          {city.shape === 'polygon' ? `${city.boundary.length} puntos` : 'Un centro'}
        </span>
      </div>

      {stores.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-light bg-surface p-3 text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">Tiendas en el mapa:</span>
          <span>{stores.length} registradas</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 font-medium text-success">
            {stores.filter((store) => store.inside).length} dentro
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 font-medium text-warning">
            {stores.filter((store) => store.inside === false).length} fuera
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 font-medium text-text-secondary">
            {stores.length - storesWithCoords.length} sin coordenadas
          </span>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-border-light bg-surface">
        <div className="h-[380px] w-full">
          <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoneViewport city={city} stores={stores} />
            <MapClickLayer city={city} onChange={onChange} />

            {city.shape === 'circle' && (
              <>
                <Marker position={city.center} icon={leafletIcon} />
                <Circle
                  center={city.center}
                  radius={Math.max(city.radius_km, 0.5) * 1000}
                  pathOptions={{ color: '#6D28D9', fillColor: '#A855F7', fillOpacity: 0.18 }}
                />
              </>
            )}

            {city.shape === 'polygon' && (
              <>
                {polylinePoints.length >= 2 && (
                  <Polyline positions={polylinePoints} pathOptions={{ color: '#6D28D9', weight: 3, dashArray: '6 8' }} />
                )}
                {polygonPoints.length >= 3 && (
                  <Polygon positions={polygonPoints} pathOptions={{ color: '#6D28D9', fillColor: '#A855F7', fillOpacity: 0.18 }} />
                )}
                {city.boundary.map((point, index) => (
                  <Marker key={`${point[0]}-${point[1]}-${index}`} position={point} icon={leafletIcon} />
                ))}
                <Marker position={center} icon={leafletIcon} />
              </>
            )}

            {storesWithCoords.map((store) => (
              <Marker
                key={store.id}
                position={[store.latitude as number, store.longitude as number]}
                icon={createStoreIcon(store)}
              >
                <Popup className="store-popup">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{store.emoji || '🏬'}</span>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{store.name}</p>
                        <p className="text-[11px] text-text-secondary">{store.city || 'Sin ciudad'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${store.inside ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {store.inside ? 'Dentro de cobertura' : 'Fuera de cobertura'}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${store.is_open ? 'bg-brand-light text-brand' : 'bg-surface-hover text-text-secondary'}`}>
                        {store.is_open ? 'Abierta' : 'Cerrada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      {store.distanceLabel || 'Sin referencia'} {store.zoneRadiusKm ? `- zona ${store.zoneRadiusKm} km` : ''}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Haz clic sobre el mapa para mover el centro o agregar puntos al poligono. La cobertura se guarda por ciudad y se mantiene compatible con el modo anterior.
      </p>
    </div>
  );
}
