import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import type { CoordinatePair } from '../../../shared/utils/coordinates';

// Evita markers rotos con Vite (rutas CDN en vez de assets locales).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const storeIcon = L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏪</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">📍</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});

const courierIcon = L.divIcon({
  className: '',
  html: '<div style="width:40px;height:40px;border-radius:50%;background:#6D28D9;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(109,40,217,0.5);font-size:18px;">🛵</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

interface PublicOrderMapProps {
  store: CoordinatePair | null;
  dest: CoordinatePair | null;
  courier: CoordinatePair | null;
  storeName?: string | null;
}

function FitController({ points }: { points: CoordinatePair[] }) {
  const map = useMap();
  const fitted = useRef('');
  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');
    if (fitted.current === key) return;
    fitted.current = key;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export function PublicOrderMap({ store, dest, courier, storeName }: PublicOrderMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [follow, setFollow] = useState(true);
  const courierRef = useRef<L.Marker | null>(null);

  const points = [store, dest, courier].filter((p): p is CoordinatePair => p !== null);
  const center: CoordinatePair = courier ?? store ?? dest ?? [-0.4632, -76.9892];

  // Movimiento suave del repartidor + seguimiento opcional.
  useEffect(() => {
    if (courierRef.current && courier) courierRef.current.setLatLng(courier);
  }, [courier]);
  useEffect(() => {
    if (follow && map && courier) map.panTo(courier);
  }, [courier, follow, map]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl" data-testid="public-order-map">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={false}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitController points={points} />
        {courier && store && <Polyline positions={[store, courier]} color="#7C3AED" weight={5} opacity={0.8} />}
        {courier && dest && (
          <Polyline positions={[courier, dest]} color="#7C3AED" weight={4} opacity={0.6} dashArray="5, 10" />
        )}
        {!courier && store && dest && (
          <Polyline positions={[store, dest]} color="#9CA3AF" weight={4} opacity={0.6} dashArray="5, 8" />
        )}
        {store && (
          <Marker position={store} icon={storeIcon}>
            <Popup>{storeName || 'Restaurante / tienda'}</Popup>
          </Marker>
        )}
        {dest && (
          <Marker position={dest} icon={destIcon}>
            <Popup>Destino de entrega</Popup>
          </Marker>
        )}
        {courier && (
          <Marker ref={courierRef} position={courier} icon={courierIcon}>
            <Popup>Repartidor RayoExpress</Popup>
          </Marker>
        )}
      </MapContainer>
      {courier && (
        <button
          type="button"
          onClick={() => {
            setFollow(true);
            if (map && courier) map.panTo(courier);
          }}
          className={`absolute right-3 top-3 z-[1000] w-9 h-9 rounded-xl shadow-lg flex items-center justify-center transition-all ${
            follow ? 'bg-purple-600 text-white' : 'bg-white text-text-primary'
          }`}
          title="Seguir repartidor"
          aria-label="Seguir repartidor"
        >
          <Navigation size={16} className={follow ? 'animate-pulse' : ''} />
        </button>
      )}
    </div>
  );
}
