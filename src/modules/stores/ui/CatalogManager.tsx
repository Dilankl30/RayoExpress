import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Settings, Trash2, X, Save } from 'lucide-react';
import { getStoreProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory, deleteCategory } from '../application/store-catalog.service';
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
  const [form, setForm] = useState({ name: '', price: '', emoji: '🍔', description: '', category_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getStoreProducts(storeId), getCategories()]);
      setProducts(p);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]);

  const resetForm = () => {
    setForm({ name: '', price: '', emoji: '🍔', description: '', category_id: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (p: ProductData) => {
    setForm({ name: p.name, price: String(p.price), emoji: p.emoji, description: p.description || '', category_id: p.category_id || '' });
    setEditingId(p.id || null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const productData = { name: form.name, price: Number(form.price), emoji: form.emoji, description: form.description || null, category_id: form.category_id || null, is_active: true, image_url: null };
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
        <h3 className="text-gray-900 font-semibold">Mi catálogo</h3>
        <button
          onClick={() => resetForm()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm shadow-lg"
          style={{ backgroundColor: '#6D28D9' }}
        >
          <Plus size={14} />
          Nuevo producto
        </button>
      </div>

      {showForm && (
        <motion.div
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 space-y-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{editingId ? 'Editar producto' : 'Nuevo producto'}</p>
            <button onClick={resetForm} className="text-gray-400"><X size={16} /></button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none" />
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" step="0.01" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl">{form.emoji}</div>
              <select value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-xs bg-gray-50 rounded-lg px-1 py-1 outline-none">
                {defaultEmojis.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows={2} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none resize-none" />

          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>

          <button onClick={handleSave} className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2" style={{ backgroundColor: '#6D28D9' }}>
            <Save size={14} /> {editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </motion.div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nueva categoría..." className="flex-1 bg-white rounded-xl px-3 py-2 text-sm outline-none border border-gray-200" />
        <button onClick={handleAddCategory} className="px-3 py-2 rounded-xl text-white text-xs" style={{ backgroundColor: '#6D28D9' }}><Plus size={14} /></button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: cat.bg_color }}>
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              <button onClick={() => handleDeleteCategory(cat.id!)} className="ml-1 text-gray-400 hover:text-red-500"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {grouped.map((cat) => (
        <div key={cat.id} className="mb-4">
          {cat.products.length > 0 && (
            <>
              <p className="text-sm font-medium text-gray-700 mb-2">{cat.emoji} {cat.name}</p>
              <div className="space-y-2">
                {cat.products.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50 text-xl">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">${p.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Settings size={13} className="text-gray-500" /></button>
                      <button onClick={() => handleDelete(p.id!)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
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
          <p className="text-sm font-medium text-gray-400 mb-2">📦 Sin categoría</p>
          <div className="space-y-2">
            {uncategorized.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50 text-xl">{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">${p.price.toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Settings size={13} className="text-gray-500" /></button>
                  <button onClick={() => handleDelete(p.id!)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
