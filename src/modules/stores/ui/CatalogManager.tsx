import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Settings, Trash2, X, Save, Camera } from 'lucide-react';
import { getStoreProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory, deleteCategory } from '../application/store-catalog.service';
import { uploadFile, getFileUrl } from '../../../shared/storage/storage.service';
import type { ProductData, CategoryData } from '../application/store-catalog.service';

const defaultEmojis = ['🍔', '🍕', '🌮', '🥗', '🍟', '🥤', '🍦', '🧁', '🥪', '🍗', '🌯', '🥩'];

interface Props {
  storeId: string;
}

export function CatalogManager({ storeId }: Props) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', price: '', emoji: '🍔', description: '', category_id: '' });

  const [resolvedImages, setResolvedImages] = useState<Map<string, string | null>>(new Map());

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getStoreProducts(storeId), getCategories()]);
      setProducts(p);
      setCategories(c);
      const map = new Map<string, string | null>();
      for (const prod of p) {
        if (prod.image_url) {
          try {
            const url = await getFileUrl('product-images', prod.image_url);
            map.set(prod.id!, url);
          } catch { map.set(prod.id!, null); }
        }
      }
      setResolvedImages(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]);

  const resetForm = () => {
    setForm({ name: '', price: '', emoji: '🍔', description: '', category_id: '' });
    setEditingId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
  };

  const handleEdit = (p: ProductData) => {
    setForm({ name: p.name, price: String(p.price), emoji: p.emoji, description: p.description || '', category_id: p.category_id || '' });
    setEditingId(p.id || null);
    setShowForm(true);
    if (p.image_url) {
      setExistingImage(p.image_url);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;

    let imageUrl: string | null = existingImage;

    if (imageFile) {
      const { path } = await uploadFile('product-images', storeId, imageFile);
      imageUrl = path;
    }

    const productData = {
      name: form.name,
      price: Number(form.price),
      emoji: form.emoji,
      description: form.description || null,
      category_id: form.category_id || null,
      is_active: true,
      image_url: imageUrl,
    };

    if (editingId) {
      await updateProduct(editingId, productData);
    } else {
      await createProduct(storeId, productData);
    }
    resetForm();
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    await load();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const colors = ['#FEF3C7', '#FEE2E2', '#FFEDD5', '#F3E8FF', '#ECFDF5', '#FCE7F3', '#E0F2FE', '#D1FAE5'];
    await createCategory({ name: newCatName, emoji: '📦', bg_color: colors[categories.length % colors.length] });
    setNewCatName('');
    await load();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    await load();
  };

  const handleImageSelect = (f: File) => {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setExistingImage(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const grouped = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));
  const uncategorized = products.filter((p) => !p.category_id);

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-text-primary font-semibold">Mi catálogo</h3>
        <button
          onClick={() => resetForm()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm shadow-lg"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Plus size={14} />
          Nuevo producto
        </button>
      </div>

      {showForm && (
        <motion.div
          className="bg-card rounded-2xl p-4 shadow-sm border border-border-light mb-4 space-y-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">{editingId ? 'Editar producto' : 'Nuevo producto'}</p>
            <button onClick={resetForm} className="text-text-secondary"><X size={16} /></button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none" />
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" step="0.01" className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl">{form.emoji}</div>
              <select value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-xs bg-surface rounded-lg px-1 py-1 outline-none">
                {defaultEmojis.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows={2} className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none resize-none" />

          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Imagen del producto</p>
            {(imagePreview || existingImage) ? (
              <div className="relative bg-surface rounded-xl overflow-hidden mb-2">
                <img src={imagePreview || existingImage || ''} alt="Producto" className="w-full h-32 object-contain" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); setExistingImage(null); }} className="absolute top-1 right-1 w-6 h-6 bg-card rounded-full shadow flex items-center justify-center">
                  <X size={12} className="text-text-secondary" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-border flex flex-col items-center gap-1 hover:border-purple-300 transition-colors"
              >
                <Camera size={18} className="text-text-secondary" />
                <span className="text-xs text-text-secondary">Subir imagen</span>
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }} />
          </div>

          <button onClick={handleSave} className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--brand)' }}>
            <Save size={14} /> {editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </motion.div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nueva categoría..." className="flex-1 bg-card rounded-xl px-3 py-2 text-sm outline-none border border-border" />
        <button onClick={handleAddCategory} className="px-3 py-2 rounded-xl text-white text-xs" style={{ backgroundColor: 'var(--brand)' }}><Plus size={14} /></button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: cat.bg_color }}>
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              <button onClick={() => handleDeleteCategory(cat.id!)} className="ml-1 text-text-secondary hover:text-danger"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {grouped.map((cat) => (
        <div key={cat.id} className="mb-4">
          {cat.products.length > 0 && (
            <>
              <p className="text-sm font-medium text-text-primary mb-2">{cat.emoji} {cat.name}</p>
              <div className="space-y-2">
                {cat.products.map((p) => (
                  <div key={p.id} className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface text-xl overflow-hidden">
                      {p.image_url && resolvedImages.get(p.id!) ? (
                        <img src={resolvedImages.get(p.id!)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                      <p className="text-xs text-text-secondary">${p.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center"><Settings size={13} className="text-text-secondary" /></button>
                      <button onClick={() => handleDelete(p.id!)} className="w-8 h-8 rounded-lg bg-danger-light flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-text-secondary mb-2">📦 Sin categoría</p>
          <div className="space-y-2">
            {uncategorized.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface text-xl overflow-hidden">
                  {p.image_url && resolvedImages.get(p.id!) ? (
                    <img src={resolvedImages.get(p.id!)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                  <p className="text-xs text-text-secondary">${p.price.toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center"><Settings size={13} className="text-text-secondary" /></button>
                  <button onClick={() => handleDelete(p.id!)} className="w-8 h-8 rounded-lg bg-danger-light flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
