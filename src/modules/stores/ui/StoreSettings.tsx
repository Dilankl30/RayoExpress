import { useState, useEffect } from 'react';
import { Save, Clock } from 'lucide-react';
import { getStoreInfo, updateStoreInfo, getStoreSchedule, saveStoreSchedule, getInventory, updateInventory } from '../application/store-settings.service';
import type { StoreInfo, StoreSchedule, InventoryItem } from '../application/store-settings.service';
import { getStoreProducts } from '../application/store-catalog.service';
import type { ProductData } from '../application/store-catalog.service';

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
  storeId: string;
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

  const load = async () => {
    setLoading(true);
    try {
      const [i, s, inv, p] = await Promise.all([
        getStoreInfo(storeId),
        getStoreSchedule(storeId),
        getInventory(storeId),
        getStoreProducts(storeId),
      ]);
      if (i) setInfo(i);
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
      await updateStoreInfo(storeId, info);
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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
            style={tab === t ? { backgroundColor: '#6D28D9' } : {}}
          >
            {t === 'info' ? '🏪 Info' : t === 'hours' ? '🕐 Horarios' : '📦 Inventario'}
          </button>
        ))}
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-3">
          <p className="text-green-600 text-sm">Guardado</p>
        </div>
      )}

      {tab === 'info' && info && (
        <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-1">Nombre</p>
            <input type="text" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Descripción</p>
            <textarea value={info.description || ''} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Pedido mínimo</p>
              <input type="number" value={info.min_order} onChange={(e) => setInfo({ ...info, min_order: Number(e.target.value) })} step="0.5" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Costo de envío</p>
              <input type="number" value={info.delivery_fee} onChange={(e) => setInfo({ ...info, delivery_fee: Number(e.target.value) })} step="0.5" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Emoji</p>
            <input type="text" value={info.emoji} onChange={(e) => setInfo({ ...info, emoji: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none" maxLength={2} />
          </div>
          <button onClick={handleSaveInfo} disabled={saving} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: '#6D28D9' }}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {tab === 'hours' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="space-y-2">
            {dayNames.map((name, day) => {
              const sched = schedules.find((s) => s.week_day === day);
              return (
                <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sched ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}
                  >
                    {sched && <div className="w-2 h-2 rounded-sm bg-white" />}
                  </button>
                  <span className={`text-sm flex-1 ${sched ? 'text-gray-900' : 'text-gray-400'}`}>{name}</span>
                  {sched && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={sched.opens_at} onChange={(e) => updateSchedule(day, 'opens_at', e.target.value)} className="bg-gray-50 rounded-lg px-2 py-1 text-sm outline-none" />
                      <span className="text-gray-400 text-xs">a</span>
                      <input type="time" value={sched.closes_at} onChange={(e) => updateSchedule(day, 'closes_at', e.target.value)} className="bg-gray-50 rounded-lg px-2 py-1 text-sm outline-none" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={handleSaveSchedule} disabled={saving} className="w-full mt-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: '#6D28D9' }}>
            <Clock size={16} /> {saving ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          {inventory.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              {products.length === 0 ? 'Crea productos primero para gestionar el inventario' : 'Sin inventario registrado'}
            </p>
          )}
          {inventory.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xl">{item.product_emoji || '📦'}</span>
              <span className="flex-1 text-sm text-gray-900">{item.product_name || 'Producto'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (item.id && item.quantity > 0) {
                      await updateInventory(item.id, item.quantity - 1);
                      await load();
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold"
                >−</button>
                <span className={`text-sm font-bold w-8 text-center ${item.quantity <= item.low_stock_threshold ? 'text-red-500' : 'text-gray-900'}`}>
                  {item.quantity}
                </span>
                <button
                  onClick={async () => {
                    if (item.id) {
                      await updateInventory(item.id, item.quantity + 1);
                      await load();
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold"
                >+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
