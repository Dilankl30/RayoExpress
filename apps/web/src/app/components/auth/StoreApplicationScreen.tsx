import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Store, CheckCircle, Clock, XCircle, Camera, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { submitStoreApplication, getMyStoreApplication } from '../../../modules/stores/application/store-application.service';
import { uploadFile } from '../../../shared/storage/storage.service';
import { formatCoordinates, toCoordinatePair } from '../../../shared/utils/coordinates';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function StoreApplicationScreen() {
  const { user, navigate } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('El Coca');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mapCenter: [number, number] = [-2.1706, -79.9223];
  const storeCoords = toCoordinatePair(latitude, longitude);

  useEffect(() => {
    if (!user) return;
    getMyStoreApplication(user.id)
      .then((app) => { setExisting(app as { status: string } | null); })
      .catch(() => { /* no hay solicitud previa */ })
      .finally(() => setChecking(false));
  }, [user]);

  if (!user || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (existing) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('home')} className="text-text-secondary">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-text-primary">Solicitud de Tienda</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          {existing.status === 'pending' && (
            <div className="bg-warning-light rounded-2xl p-8 border border-amber-200">
              <Clock size={48} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">Solicitud en revisión</h2>
              <p className="text-sm text-text-secondary">Tu solicitud está siendo evaluada. Te notificaremos cuando haya una respuesta.</p>
            </div>
          )}
          {existing.status === 'approved' && (
            <div className="bg-success-light rounded-2xl p-8 border border-green-200">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">¡Solicitud aprobada!</h2>
              <p className="text-sm text-text-secondary">Ya puedes gestionar tu tienda desde el panel de tienda.</p>
            </div>
          )}
          {existing.status === 'rejected' && (
            <div className="bg-danger-light rounded-2xl p-8 border border-red-200">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">Solicitud rechazada</h2>
              <p className="text-sm text-text-secondary">Comunícate con soporte para más información.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!storeName.trim()) return setError('Ingresa el nombre de la tienda');
    setError('');
    setLoading(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const { path } = await uploadFile('product-images', user.id, photoFile);
        photoUrl = path;
      }
      await submitStoreApplication(user.id, { storeName, description, address, phone, city, photoUrl, latitude, longitude });
      setExisting({ status: 'pending' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-text-primary">Registrar Tienda</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex items-start gap-3">
          <Store className="text-purple-600 mt-1" size={20} />
          <div>
            <p className="text-sm font-semibold text-text-primary">¿Tienes un negocio?</p>
            <p className="text-xs text-text-secondary">Completa el formulario y un administrador revisará tu solicitud para activar tu tienda en RayoExpress.</p>
          </div>
        </div>

        {error && (
          <div className="bg-danger-light border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl p-5 space-y-4 shadow-sm border border-border">
          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Nombre de la tienda</p>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ej: Mi Tienda"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Descripción</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu negocio..."
              rows={3}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm resize-none"
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Dirección</p>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección del local"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Ciudad</p>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            >
              <option value="El Coca">El Coca</option>
              <option value="Francisco de Orellana">Francisco de Orellana</option>
              <option value="Quito">Quito</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Cuenca">Cuenca</option>
              <option value="Santo Domingo">Santo Domingo</option>
              <option value="Quevedo">Quevedo</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Teléfono de contacto</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+593 99 999 9999"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          {/*** Foto del negocio ***/}
          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Foto del negocio</p>
            {photoPreview ? (
              <div className="relative bg-surface rounded-xl overflow-hidden mb-2">
                <img src={photoPreview} alt="Negocio" className="w-full h-40 object-cover" />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-2 right-2 w-7 h-7 bg-card rounded-full shadow flex items-center justify-center">
                  <X size={14} className="text-text-secondary" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center gap-1 hover:border-purple-300 transition-colors"
              >
                <Camera size={22} className="text-text-secondary" />
                <span className="text-xs text-text-secondary">Agregar foto del local</span>
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
          </div>

          {/*** Ubicación en el mapa ***/}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-secondary font-medium">Ubicación del negocio</p>
              <button onClick={() => setShowMap(!showMap)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${showMap ? 'text-brand bg-purple-100' : 'text-text-secondary bg-surface-hover'}`}>
                {showMap ? 'Cerrar mapa' : storeCoords ? 'Cambiar ubicación' : 'Seleccionar en mapa'}
              </button>
            </div>
            {storeCoords && !showMap && (
              <p className="text-xs text-text-secondary">{formatCoordinates(storeCoords)}</p>
            )}
            {showMap && (
              <div className="rounded-xl overflow-hidden border border-border-light z-0" style={{ height: 260 }}>
                <MapContainer center={storeCoords ?? mapCenter} zoom={15} className="h-full w-full" scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  <LocationPicker onPick={(lat: number, lng: number) => { setLatitude(lat); setLongitude(lng); }} />
                  {storeCoords && <Marker position={storeCoords} />}
                </MapContainer>
              </div>
            )}
          </div>

          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#6D28D9' }}
            whileTap={{ scale: 0.98 }}
          >
            <Store size={16} />
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
