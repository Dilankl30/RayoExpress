import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Search, Star, X, Clock, Compass, Home, Locate, ChevronRight, Plus, Minus
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getSupabase } from '../../../integrations/supabase/client';
import { getStores, getCategories, getStoresInBounds } from '../../../modules/stores/application/store-service';
import { getAddresses } from '../../../modules/client/application/client-service';
import type { Address, Database } from '../../../shared/types';

type Store = Database['public']['Tables']['stores']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: { northEast: [number, number], southWest: [number, number] }) => void }) {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        northEast: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
        southWest: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      });
    },
  });
  return null;
}

function MapInstanceSaver({ setMap }: { setMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

export function ExploreScreen() {
  const { navigate, user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [userAddress, setUserAddress] = useState('Ubicación de entrega');
  const [selectedStoreOnMap, setSelectedStoreOnMap] = useState<Store | null>(null);
  const [coverageArea, setCoverageArea] = useState<{ center: [number, number]; radius_km: number; city_name: string } | null>(null);

  // Load configuration and data
  useEffect(() => {
    const loadCoverageAndStores = async () => {
      try {
        const supabase = getSupabase();
        const { data: configData } = await supabase
          .from('app_config')
          .select('*')
          .eq('key', 'coverage_area')
          .maybeSingle();
        
        let centerCoords: [number, number] = [-0.4632, -76.9892]; // El Coca default
        if (configData && configData.value) {
          const val = configData.value as any;
          setCoverageArea(val);
          if (val.center) centerCoords = val.center;
        }

        // Get stores and categories
        const [storesData, catsData] = await Promise.all([
          getStores(),
          getCategories()
        ]);
        setStores(storesData);
        setCategories(catsData);
      } catch (err) {
        console.error('Error loading explore data:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadCoverageAndStores();
  }, []);

  // Load user location
  useEffect(() => {
    const loadUserAddressAndCoords = async () => {
      if (!user) return;
      try {
        const addresses = await getAddresses(user.id);
        const selected = addresses.find((address) => address.is_default) ?? addresses[0];
        if (selected?.line1) setUserAddress(selected.line1);
        if (selected?.lat && selected?.lng) {
          setUserCoords([selected.lat, selected.lng]);
        } else {
          // Geolocation fallback
          navigator.geolocation.getCurrentPosition((pos) => {
            setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          }, () => {
            // Permission denied or error
          });
        }
      } catch {
        // Ignored
      }
    };

    void loadUserAddressAndCoords();
  }, [user]);

  // Center map on userCoords or coverage center when loaded
  useEffect(() => {
    if (map) {
      const center = userCoords || (coverageArea?.center || [-0.4632, -76.9892]);
      map.setView(center, userCoords ? 14 : 13);
    }
  }, [map, userCoords, coverageArea]);

  const handleBoundsChange = async (bounds: { northEast: [number, number], southWest: [number, number] }) => {
    try {
      const storesInBounds = await getStoresInBounds(bounds.northEast, bounds.southWest);
      // Keep state stores up to date if we scroll
      if (storesInBounds.length > 0) {
        setStores((prev) => {
          const combined = [...prev];
          for (const s of storesInBounds) {
            if (!combined.some((item) => item.id === s.id)) {
              combined.push(s);
            }
          }
          return combined;
        });
      }
    } catch { /* noop */ }
  };

  const handleSelectStore = useCallback((id: string) => {
    navigate(`store-detail/${id}`);
  }, [navigate]);

  // Filter stores in client side
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchSearch = store.name.toLowerCase().includes(search.toLowerCase()) || 
        (store.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchCategory = !activeCategory || store.category_id === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [stores, search, activeCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-[#12051F] flex flex-col relative pb-16 lg:pb-0">
      {/* HEADER SECTION */}
      <div className="pt-6 pb-4 px-4 bg-white border-b border-slate-100 flex flex-col gap-4 shadow-sm z-10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Compass className="text-purple-600 animate-pulse" size={22} />
              Explora tiendas cercanas
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Selecciona una tienda registrada para pedir</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 shadow-sm max-w-[180px] truncate">
            <MapPin size={13} className="text-purple-600 flex-shrink-0" />
            <span className="truncate">{userAddress}</span>
          </div>
        </div>

        {/* SEARCH BAR & CATEGORIES */}
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-3">
          <div className="relative flex items-center w-full">
            <span className="absolute left-4 text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tiendas o categorías"
              className="w-full bg-slate-50 border border-slate-200/60 rounded-full py-2.5 pl-11 pr-12 text-sm font-bold outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner placeholder:text-slate-400"
            />
            <button
              onClick={() => {
                if (map) {
                  const center = userCoords || (coverageArea?.center || [-0.4632, -76.9892]);
                  map.panTo(center);
                }
              }}
              className="absolute right-3 w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-purple-600 active:scale-90 transition-all shadow-sm"
              title="Centrar en mi ubicación"
            >
              <Locate size={15} />
            </button>
          </div>

          {/* Category Carousel */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 scroll-smooth">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold transition-all border ${
                  !activeCategory
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                ✨ Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                    cat.id === activeCategory
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.emoji || '🏪'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="flex-1 w-full relative z-0" style={{ minHeight: 'calc(100vh - 240px)' }}>
        {loading ? (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Cargando mapa interactivo...</p>
            </div>
          </div>
        ) : null}

        <MapContainer
          center={userCoords || (coverageArea?.center || [-0.4632, -76.9892])}
          zoom={userCoords ? 14 : 13}
          className="h-full w-full absolute inset-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapInstanceSaver setMap={setMap} />
          <MapBoundsHandler onBoundsChange={handleBoundsChange} />

          {/* Store Markers */}
          {filteredStores.filter((s) => s.latitude && s.longitude).map((store) => (
            <Marker
              key={store.id}
              position={[store.latitude!, store.longitude!]}
              icon={L.divIcon({
                className: '',
                html: `<div class="relative flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.15)] border border-slate-100/50 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap">
                  <div class="w-6 h-6 rounded-lg flex items-center justify-center text-sm bg-purple-50 text-purple-700">
                    ${store.emoji || '🏪'}
                  </div>
                  <div class="flex flex-col text-left pr-1">
                    <span class="text-[9px] font-extrabold text-slate-800 leading-tight">${store.name}</span>
                    <span class="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">
                      ${store.is_open ? '🟢 Abierto' : '🔴 Cerrado'}
                    </span>
                  </div>
                  <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rotate-45 border-r border-b border-slate-100/50"></div>
                </div>`,
                iconSize: [120, 34],
                iconAnchor: [60, 34],
              })}
              eventHandlers={{
                click: () => setSelectedStoreOnMap(store),
              }}
            />
          ))}

          {/* User Marker */}
          {userCoords && (
            <Marker
              position={userCoords}
              icon={L.divIcon({
                className: '',
                html: `<div class="relative flex items-center justify-center w-6 h-6">
                  <div class="absolute inset-0 w-6 h-6 rounded-full bg-blue-500/30 animate-ping"></div>
                  <div class="absolute w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
                </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup>
                <div className="text-center p-1 font-sans">
                  <p className="font-bold text-xs text-text-primary">Mi ubicación</p>
                  <p className="text-[10px] text-text-secondary mt-0.5 leading-none">{userAddress}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Zoom / Action Buttons */}
        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5 bg-white/85 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-100">
          <button
            onClick={() => map?.zoomIn()}
            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
            title="Acercar"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => map?.zoomOut()}
            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
            title="Alejar"
          >
            <Minus size={14} />
          </button>

          <div className="h-[1px] bg-slate-100 my-0.5" />

          <button
            onClick={() => {
              if (!map) return;
              if (userCoords) {
                map.panTo(userCoords);
              } else {
                map.panTo(coverageArea?.center || [-0.4632, -76.9892]);
              }
            }}
            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
            title="Mi ubicación"
          >
            <Home size={14} />
          </button>

          <button
            onClick={() => {
              if (!map) return;
              const activeStores = filteredStores.filter((s) => s.latitude && s.longitude);
              const points: L.LatLngExpression[] = activeStores.map((s) => [s.latitude!, s.longitude!]);
              if (userCoords) points.push(userCoords);
              if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
              }
            }}
            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
            title="Ajustar a todas las tiendas"
          >
            <Locate size={14} />
          </button>
        </div>

        {/* Selected Store Sliding Info Sheet */}
        <AnimatePresence>
          {selectedStoreOnMap && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-2xl border border-slate-100 shadow-2xl p-4 flex flex-col gap-3 max-w-[420px] mx-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl shadow-sm border border-purple-100/50">
                    {selectedStoreOnMap.emoji || '🏪'}
                  </div>
                  <div className="text-left">
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{selectedStoreOnMap.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1">
                      {selectedStoreOnMap.description || 'Tienda registrada'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStoreOnMap(null)}
                  className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-90 transition-all shadow-sm"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedStoreOnMap.is_open ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {selectedStoreOnMap.is_open ? 'Abierto' : 'Cerrado'}
                  </span>
                  <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Star size={9} className="fill-amber-400 text-amber-400" /> 4.8
                  </span>
                  <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={10} /> 25-35 min
                  </span>
                </div>

                <button
                  onClick={() => handleSelectStore(selectedStoreOnMap.id)}
                  className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-purple-600/10 transition-all active:scale-95 hover:opacity-95"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  Ver tienda
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
