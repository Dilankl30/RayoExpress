import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Eye, EyeOff, Image as ImageIcon, Plus, RotateCcw,
  Loader2, Save, Trash2, Upload, Video,
} from 'lucide-react';
import {
  DEFAULT_HOME_ADS,
  getHomeAds,
  saveHomeAds,
  type HomeAd,
  type HomeAdMediaType,
} from '../application/home-ads.service';
import { getFileUrl, uploadFile } from '../../../shared/storage/storage.service';

const emptyAd = (): HomeAd => ({
  id: `ad-${Date.now()}`,
  title: 'Nuevo anuncio',
  subtitle: 'Describe la promocion',
  cta_label: 'Ver mas',
  target_path: '/promotions',
  bg: 'linear-gradient(135deg, #6D28D9 0%, #F59E0B 100%)',
  text_color: '#FFFFFF',
  media_type: 'none',
  media_url: '',
  active: true,
  sort_order: 0,
});

function normalizeAdsForEdit(ads: HomeAd[]) {
  return ads.map((ad, index) => ({ ...ad, sort_order: index }));
}

function MediaPreview({ ad }: { ad: HomeAd }) {
  const hasMedia = ad.media_type !== 'none' && ad.media_url.trim();

  return (
    <div
      className="relative h-32 overflow-hidden rounded-2xl border border-border"
      style={{ background: ad.bg }}
    >
      {ad.media_type === 'image' && hasMedia && (
        <img src={ad.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {ad.media_type === 'video' && hasMedia && (
        <video src={ad.media_url} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline controls />
      )}
      {hasMedia && <div className="absolute inset-0 bg-black/35" />}
      <div className="relative z-10 flex h-full flex-col justify-center p-4">
        <p className="text-lg font-black" style={{ color: ad.text_color }}>{ad.title || 'Titulo'}</p>
        <p className="mt-1 text-sm" style={{ color: ad.text_color }}>{ad.subtitle || 'Subtitulo'}</p>
        <span
          className="mt-3 w-fit rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.28)', color: ad.text_color }}
        >
          {ad.cta_label || 'Accion'}
        </span>
      </div>
    </div>
  );
}

export function HomeAdsManager() {
  const [ads, setAds] = useState<HomeAd[]>(DEFAULT_HOME_ADS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAdId, setUploadingAdId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => ads.filter((ad) => ad.active).length, [ads]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAds(normalizeAdsForEdit(await getHomeAds()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar publicidad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateAd = (id: string, patch: Partial<HomeAd>) => {
    setAds((current) => current.map((ad) => (ad.id === id ? { ...ad, ...patch } : ad)));
  };

  const moveAd = (id: string, direction: -1 | 1) => {
    setAds((current) => {
      const index = current.findIndex((ad) => ad.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return normalizeAdsForEdit(next);
    });
  };

  const addAd = () => {
    setAds((current) => normalizeAdsForEdit([...current, emptyAd()]));
  };

  const removeAd = (id: string) => {
    setAds((current) => normalizeAdsForEdit(current.filter((ad) => ad.id !== id)));
  };

  const handleMediaUpload = async (ad: HomeAd, file: File | null | undefined) => {
    if (!file) return;

    const mediaType: HomeAdMediaType = file.type.startsWith('video/') ? 'video' : 'image';
    setUploadingAdId(ad.id);
    setMessage(null);
    setError(null);

    try {
      const { path, storagePath } = await uploadFile('marketing-media', ad.id, file);
      const mediaUrl = storagePath.startsWith('blob:')
        ? storagePath
        : await getFileUrl('marketing-media', path);

      updateAd(ad.id, {
        media_type: mediaType,
        media_url: mediaUrl || storagePath || path,
      });
      setMessage('Archivo cargado. Guarda para publicarlo en el inicio.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo');
    } finally {
      setUploadingAdId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const normalized = normalizeAdsForEdit(ads);
      await saveHomeAds(normalized);
      setAds(normalized);
      setMessage('Publicidad guardada. El inicio se actualizara al recargar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar publicidad');
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    setAds(DEFAULT_HOME_ADS.map((ad) => ({ ...ad })));
    setMessage('Valores por defecto cargados. Guarda para publicarlos.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Home</p>
          <h2 className="text-xl font-black text-text-primary">Publicidad del inicio</h2>
          <p className="text-sm text-text-secondary">
            Administra banners, videos y posts promocionales que ve el cliente en el inicio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addAd}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-text-primary"
          >
            <Plus size={16} /> Agregar
          </button>
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-text-primary"
          >
            <RotateCcw size={16} /> Defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || ads.length === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-text-secondary">
        Activos: <strong className="text-text-primary">{activeCount}</strong> de <strong className="text-text-primary">{ads.length}</strong>.
        Usa rutas internas como <code className="rounded bg-surface px-1">/promotions</code> o URLs externas completas.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {ads.map((ad, index) => (
          <div key={ad.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-text-primary">Anuncio #{index + 1}</p>
                <p className="text-xs text-text-secondary">Orden {index + 1}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateAd(ad.id, { active: !ad.active })}
                  className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover"
                  title={ad.active ? 'Ocultar' : 'Activar'}
                >
                  {ad.active ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button type="button" onClick={() => moveAd(ad.id, -1)} disabled={index === 0} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-30">
                  <ArrowUp size={17} />
                </button>
                <button type="button" onClick={() => moveAd(ad.id, 1)} disabled={index === ads.length - 1} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-30">
                  <ArrowDown size={17} />
                </button>
                <button type="button" onClick={() => removeAd(ad.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-text-secondary">Titulo</span>
                  <input value={ad.title} onChange={(e) => updateAd(ad.id, { title: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-text-secondary">Descripcion</span>
                  <input value={ad.subtitle} onChange={(e) => updateAd(ad.id, { subtitle: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-text-secondary">Boton</span>
                    <input value={ad.cta_label} onChange={(e) => updateAd(ad.id, { cta_label: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-text-secondary">Destino</span>
                    <input value={ad.target_path} onChange={(e) => updateAd(ad.id, { target_path: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-text-secondary">Fondo CSS</span>
                    <input value={ad.bg} onChange={(e) => updateAd(ad.id, { bg: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-text-secondary">Texto</span>
                    <input type="color" value={ad.text_color} onChange={(e) => updateAd(ad.id, { text_color: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-card p-1" />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-text-secondary">Media</span>
                      <select
                        value={ad.media_type}
                        onChange={(e) => updateAd(ad.id, { media_type: e.target.value as HomeAdMediaType })}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                      >
                        <option value="none">Sin media</option>
                        <option value="image">Imagen</option>
                        <option value="video">Video</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-text-secondary">
                        {ad.media_type === 'video' ? <Video size={14} className="inline" /> : <ImageIcon size={14} className="inline" />} URL de media
                      </span>
                      <input
                        value={ad.media_url}
                        onChange={(e) => updateAd(ad.id, { media_url: e.target.value })}
                        placeholder="https://..."
                        disabled={ad.media_type === 'none'}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <label
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-2 text-sm font-bold text-text-primary transition hover:bg-surface-hover ${
                      uploadingAdId === ad.id ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {uploadingAdId === ad.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingAdId === ad.id ? 'Subiendo...' : 'Subir imagen o video'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                      disabled={uploadingAdId === ad.id}
                      className="hidden"
                      onChange={(event) => {
                        void handleMediaUpload(ad, event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              <MediaPreview ad={ad} />
            </div>
          </div>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-bold text-text-primary">No hay anuncios configurados</p>
          <button type="button" onClick={addAd} className="mt-3 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: 'var(--brand)' }}>
            Crear primer anuncio
          </button>
        </div>
      )}
    </div>
  );
}
