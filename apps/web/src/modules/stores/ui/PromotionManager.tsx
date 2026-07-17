import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Ticket, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import {
  createStorePromotion,
  deleteStorePromotion,
  getStorePromotions,
  updateStorePromotion,
  type StorePromotionData,
} from '../application/store-catalog.service';

type PromotionForm = Omit<StorePromotionData, 'id' | 'store_id' | 'uses_count'>;

const defaultForm: PromotionForm = {
  title: '',
  description: '',
  code: '',
  type: 'coupon',
  discount_type: 'percentage',
  discount_value: 10,
  min_order: 0,
  max_uses: 100,
  max_uses_per_customer: 1,
  starts_at: null,
  ends_at: null,
  active: true,
  is_active: true,
  bg_color: '#6D28D9',
  text_color: '#FFFFFF',
  emoji: '🎟️',
};

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function PromotionManager({ storeId }: { storeId: string }) {
  const [promotions, setPromotions] = useState<StorePromotionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PromotionForm>(defaultForm);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPromotions(await getStorePromotions(storeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las promociones');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (promotion: StorePromotionData) => {
    setEditingId(promotion.id ?? null);
    setForm({
      title: promotion.title,
      description: promotion.description,
      code: promotion.code,
      type: promotion.type,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      min_order: promotion.min_order,
      max_uses: promotion.max_uses,
      max_uses_per_customer: promotion.max_uses_per_customer,
      starts_at: promotion.starts_at,
      ends_at: promotion.ends_at,
      active: promotion.active,
      is_active: promotion.is_active,
      bg_color: promotion.bg_color,
      text_color: promotion.text_color,
      emoji: promotion.emoji,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Ingresa un titulo para la promocion.');
      return;
    }
    if (!form.code?.trim() && form.type === 'coupon') {
      setError('Ingresa un codigo para el cupon.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...form, is_active: form.active };
      if (editingId) {
        await updateStorePromotion(editingId, payload);
      } else {
        await createStorePromotion(storeId, payload);
      }
      resetForm();
      await loadPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la promocion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    setError('');
    try {
      await deleteStorePromotion(promotionId);
      setPromotions((items) => items.filter((promotion) => promotion.id !== promotionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la promocion');
    }
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-text-primary font-semibold">Cupones y promociones</h3>
          <p className="text-xs text-text-secondary">Crea descuentos visibles para tus clientes.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Plus size={16} />
          Nueva
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text-primary">{editingId ? 'Editar promocion' : 'Nueva promocion'}</p>
            <button type="button" onClick={resetForm} className="text-text-secondary">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titulo"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={form.code ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="Codigo del cupon"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm uppercase outline-none"
            />
            <textarea
              value={form.description ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descripcion"
              rows={2}
              className="lg:col-span-2 rounded-xl bg-surface px-3 py-2.5 text-sm outline-none resize-none"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as StorePromotionData['type'] }))}
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            >
              <option value="coupon">Cupon</option>
              <option value="restaurant">Restaurante</option>
              <option value="super">Super</option>
              <option value="shipping">Envio</option>
            </select>
            <select
              value={form.discount_type}
              onChange={(event) => setForm((prev) => ({ ...prev, discount_type: event.target.value as 'percentage' | 'fixed' }))}
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            >
              <option value="percentage">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
            <input
              type="number"
              min={0}
              value={form.discount_value}
              onChange={(event) => setForm((prev) => ({ ...prev, discount_value: Number(event.target.value) }))}
              placeholder="Descuento"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="number"
              min={0}
              value={form.min_order}
              onChange={(event) => setForm((prev) => ({ ...prev, min_order: Number(event.target.value) }))}
              placeholder="Compra minima"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="number"
              min={1}
              value={form.max_uses ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, max_uses: event.target.value ? Number(event.target.value) : null }))}
              placeholder="Usos totales"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="number"
              min={1}
              value={form.max_uses_per_customer}
              onChange={(event) => setForm((prev) => ({ ...prev, max_uses_per_customer: Number(event.target.value) }))}
              placeholder="Usos por cliente"
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="datetime-local"
              value={toDateTimeLocal(form.starts_at)}
              onChange={(event) => setForm((prev) => ({ ...prev, starts_at: fromDateTimeLocal(event.target.value) }))}
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="datetime-local"
              value={toDateTimeLocal(form.ends_at)}
              onChange={(event) => setForm((prev) => ({ ...prev, ends_at: fromDateTimeLocal(event.target.value) }))}
              className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-sm">
            <span className="font-medium text-text-primary">Promocion activa</span>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active, is_active: !prev.active }))}
              className="text-brand"
            >
              {form.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar promocion'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-text-secondary">Cargando promociones...</div>
      ) : promotions.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <Ticket size={36} className="mx-auto text-text-secondary" />
          <p className="mt-3 font-bold text-text-primary">Aun no tienes promociones</p>
          <p className="mt-1 text-sm text-text-secondary">Crea cupones o dias de descuento para atraer clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                    style={{ backgroundColor: promotion.bg_color || '#6D28D9', color: promotion.text_color || '#FFFFFF' }}
                  >
                    {promotion.emoji || '🎟️'}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{promotion.title}</p>
                    <p className="text-xs text-text-secondary">{promotion.description || 'Sin descripcion'}</p>
                    <p className="mt-1 text-xs font-bold text-brand">
                      {promotion.code || 'Sin codigo'} · {promotion.discount_type === 'fixed' ? `$${promotion.discount_value}` : `${promotion.discount_value}%`}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Usos: {promotion.uses_count}/{promotion.max_uses ?? 'sin limite'} · por cliente {promotion.max_uses_per_customer}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${promotion.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {promotion.active ? 'Activa' : 'Pausada'}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(promotion)}
                  className="flex-1 rounded-xl bg-surface py-2 text-sm font-bold text-text-primary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => promotion.id && handleDelete(promotion.id)}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
