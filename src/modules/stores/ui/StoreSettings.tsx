import { useState, useEffect, useRef } from 'react';
import { Save, Clock, Camera, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStoreInfo, updateStoreInfo, getStoreSchedule, saveStoreSchedule, getInventory, updateInventory } from '../application/store-settings.service';
import type { StoreInfo, StoreSchedule, InventoryItem } from '../application/store-settings.service';
import { getStoreProducts } from '../application/store-catalog.service';
import type { ProductData } from '../application/store-catalog.service';
import { uploadFile, getFileUrl } from '../../../shared/storage/storage.service';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
  storeId: string;
}

const CITY_OPTIONS = ['El Coca', 'Francisco de Orellana', 'Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Quevedo'];

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export function StoreSettings({ storeId }: Props) {
  const [tab, setTab] = useState<'info' | 'hours' | 'inventory'>('info');
  const [info, setInfo] = useState<StoreInfo | null>(null);
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [i, s, inv, p] = await Promise.all([
        getStoreInfo(storeId),
        getStoreSchedule(storeId),
        getInventory(storeId),
        getStoreProducts(storeId),
      ]);
      if (i) {
        setInfo(i);
        if (i.photo_url) {
          try {
            const url = await getFileUrl('product-images', i.photo_url);
            setPhotoUrl(url);
          } catch { /* noop */ }
        }
      }
      setSchedules(s.length ? s : []);
      setInventory(inv);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]);

  const handleSaveInfo = async () => {
    if (!info) return;
    setSaving(true);
    try {
      let newPhotoUrl = info.photo_url;
      if (photoFile) {
        const { path } = await uploadFile('product-images', storeId, photoFile);
        newPhotoUrl = path;
      }
      await updateStoreInfo(storeId, { ...info, photo_url: newPhotoUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await saveStoreSchedule(storeId, schedules);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (day: number, field: 'opens_at' | 'closes_at', value: string) => {
    setSchedules((prev) => prev.map((s) => s.week_day === day ? { ...s, [field]: value } : s));
  };

  const toggleDay = (day: number) => {
    const exists = schedules.find((s) => s.week_day === day);
    if (exists) {
      setSchedules((prev) => prev.filter((s) => s.week_day !== day));
    } else {
      setSchedules((prev) => [...prev, { week_day: day, opens_at: '09:00', closes_at: '21:00' }]);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex gap-2 mb-4">
        {(['info', 'hours', 'inventory'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'text-white shadow-md' : 'bg-surface-hover text-text-secondary'}`}
            style={tab === t ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {t === 'info' ? '🏪 Info' : t === 'hours' ? '🕐 Horarios' : '📦 Inventario'}
          </button>
        ))}
      </div>

      {saved && (
        <div className="bg-success-light border border-green-200 rounded-xl px-4 py-2 mb-3">
          <p className="text-success text-sm">Guardado</p>
        </div>
      )}

      {tab === 'info' && info && (
        <div className="bg-card rounded-2xl p-5 space-y-4 shadow-sm border border-border-light">
          <div>
            <p className="text-xs text-text-secondary mb-1">Nombre</p>
            <input type="text" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Descripción</p>
            <textarea value={info.description || ''} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={3} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none resize-none" />
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Dirección</p>
            <input type="text" value={info.address || ''} onChange={(e) => setInfo({ ...info, address: e.target.value })} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" placeholder="Dirección del local" />
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Teléfono</p>
            <input type="tel" value={info.phone || ''} onChange={(e) => setInfo({ ...info, phone: e.target.value })} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" placeholder="+593 99 999 9999" />
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Ciudad</p>
            <select value={info.city || ''} onChange={(e) => setInfo({ ...info, city: e.target.value })} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none">
              <option value="">Seleccionar ciudad</option>
              {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-text-secondary mb-1">Pedido mínimo</p>
              <input type="number" value={info.min_order} onChange={(e) => setInfo({ ...info, min_order: Number(e.target.value) })} step="0.5" className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Costo de envío</p>
              <input type="number" value={info.delivery_fee} onChange={(e) => setInfo({ ...info, delivery_fee: Number(e.target.value) })} step="0.5" className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Emoji</p>
            <input type="text" value={info.emoji} onChange={(e) => setInfo({ ...info, emoji: e.target.value })} className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none" maxLength={2} />
          </div>

          {/*** Foto del negocio ***/}
          <div>
            <p className="text-xs text-text-secondary mb-1">Foto del negocio</p>
            {(photoPreview || photoUrl) && !showMap ? (
              <div className="relative bg-surface rounded-xl overflow-hidden mb-2">
                <img src={photoPreview || photoUrl || ''} alt="Negocio" className="w-full h-40 object-cover" />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoUrl(null); setInfo(prev => prev ? { ...prev, photo_url: null } : prev); }} className="absolute top-2 right-2 w-7 h-7 bg-card rounded-full shadow flex items-center justify-center">
                  <X size={14} className="text-text-secondary" />
                </button>
              </div>
            ) : (
              <button onClick={() => imageInputRef.current?.click()} className="w-full py-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center gap-1 hover:border-purple-300 transition-colors">
                <Camera size={22} className="text-text-secondary" />
                <span className="text-xs text-text-secondary">{info.photo_url ? 'Cambiar foto' : 'Agregar foto del local'}</span>
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
          </div>

          {/*** Ubicación en el mapa ***/}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-secondary font-medium">Ubicación del negocio</p>
              <button onClick={() => setShowMap(!showMap)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${showMap ? 'text-brand bg-purple-100' : 'text-text-secondary bg-surface-hover'}`}>
                {showMap ? 'Cerrar mapa' : (info.latitude && info.longitude) ? 'Cambiar ubicación' : 'Seleccionar en mapa'}
              </button>
            </div>
            {info.latitude && info.longitude && !showMap && (
              <p className="text-xs text-text-secondary">{info.latitude.toFixed(4)}, {info.longitude.toFixed(4)}</p>
            )}
            {showMap && (
              <div className="rounded-xl overflow-hidden border border-border-light z-0" style={{ height: 260 }}>
                <MapContainer center={info.latitude ? [info.latitude, info.longitude!] : [-2.1706, -79.9223]} zoom={15} className="h-full w-full" scrollWheelZoom={true}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker onPick={(lat: number, lng: number) => { setInfo(prev => prev ? { ...prev, latitude: lat, longitude: lng } : prev); }} />
                  {info.latitude && info.longitude && <Marker position={[info.latitude, info.longitude]} />}
                </MapContainer>
              </div>
            )}
          </div>

          <button onClick={handleSaveInfo} disabled={saving} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--brand)' }}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {tab === 'hours' && (
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border-light">
          <div className="space-y-2">
            {dayNames.map((name, day) => {
              const sched = schedules.find((s) => s.week_day === day);
              return (
                <div key={day} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sched ? 'border-brand bg-brand' : 'border-border'}`}
                  >
                    {sched && <div className="w-2 h-2 rounded-sm bg-card" />}
                  </button>
                  <span className={`text-sm flex-1 ${sched ? 'text-text-primary' : 'text-text-secondary'}`}>{name}</span>
                  {sched && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={sched.opens_at} onChange={(e) => updateSchedule(day, 'opens_at', e.target.value)} className="bg-surface rounded-lg px-2 py-1 text-sm outline-none" />
                      <span className="text-text-secondary text-xs">a</span>
                      <input type="time" value={sched.closes_at} onChange={(e) => updateSchedule(day, 'closes_at', e.target.value)} className="bg-surface rounded-lg px-2 py-1 text-sm outline-none" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={handleSaveSchedule} disabled={saving} className="w-full mt-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--brand)' }}>
            <Clock size={16} /> {saving ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border-light space-y-3">
          {inventory.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-4">
              {products.length === 0 ? 'Crea productos primero para gestionar el inventario' : 'Sin inventario registrado'}
            </p>
          )}
          {inventory.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
              <span className="text-xl">{item.product_emoji || '📦'}</span>
              <span className="flex-1 text-sm text-text-primary">{item.product_name || 'Producto'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (item.id && item.quantity > 0) {
                      await updateInventory(item.id, item.quantity - 1);
                      await load();
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center text-text-secondary font-bold"
                >−</button>
                <span className={`text-sm font-bold w-8 text-center ${item.quantity <= item.low_stock_threshold ? 'text-danger' : 'text-text-primary'}`}>
                  {item.quantity}
                </span>
                <button
                  onClick={async () => {
                    if (item.id) {
                      await updateInventory(item.id, item.quantity + 1);
                      await load();
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center text-text-secondary font-bold"
                >+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
