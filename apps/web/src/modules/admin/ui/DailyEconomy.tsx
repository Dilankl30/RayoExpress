import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDailySummary, type DailySummary } from '../application/daily-summary.service';

function formatCurrency(n: number): string {
  return Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function formatDayLabel(key: string): string {
  const today = new Date();
  const label = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (key === label) return 'HOY';
  return key;
}

/** Bloque HOY / ECONÓMICO / DISTRIBUCIÓN 25-75. Reutilizado en Dashboard y Liquidaciones. */
export function DailyEconomy({ initialDate }: { initialDate?: Date }) {
  const [offset, setOffset] = useState(0);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = initialDate ?? new Date();
    const target = new Date(base);
    target.setDate(target.getDate() + offset);
    setLoading(true);
    getDailySummary(target).then(setSummary).catch(() => {}).finally(() => setLoading(false));
  }, [offset, initialDate]);

  if (loading || !summary) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const o = summary.orders;
  const e = summary.economic;
  const d = summary.distribution;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-text-primary">Control diario · {formatDayLabel(summary.date)}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setOffset((v) => v - 1)} aria-label="Día anterior"
            className="p-1.5 rounded-lg bg-surface-hover text-text-secondary">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setOffset(0)} className="px-2 text-xs font-semibold text-text-secondary">
            Hoy
          </button>
          <button type="button" onClick={() => setOffset((v) => Math.min(0, v + 1))} aria-label="Día siguiente"
            className="p-1.5 rounded-lg bg-surface-hover text-text-secondary" disabled={offset >= 0}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">Pedidos</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Pedidos', value: String(o.total) },
            { label: 'Entregados', value: String(o.delivered) },
            { label: 'En camino', value: String(o.inTransit) },
            { label: 'Pendientes', value: String(o.pending) },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-surface p-2 border border-border-light">
              <p className="text-lg font-bold text-text-primary">{k.value}</p>
              <p className="text-[11px] text-text-secondary">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">Económico</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface p-3 border border-border-light">
            <p className="text-[11px] text-text-secondary">Productos</p>
            <p className="font-bold text-text-primary">{formatCurrency(e.products)}</p>
          </div>
          <div className="rounded-xl bg-surface p-3 border border-border-light">
            <p className="text-[11px] text-text-secondary">Servicios</p>
            <p className="font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(e.services)}</p>
          </div>
          <div className="rounded-xl bg-surface p-3 border border-border-light">
            <p className="text-[11px] text-text-secondary">Pagos recibidos</p>
            <p className="font-bold" style={{ color: '#22C55E' }}>{formatCurrency(e.received)}</p>
          </div>
          <div className="rounded-xl bg-surface p-3 border border-border-light">
            <p className="text-[11px] text-text-secondary">Pagos pendientes</p>
            <p className="font-bold text-red-600">{formatCurrency(e.pendingAmount)}</p>
          </div>
        </div>
        {e.advances > 0 && (
          <p className="text-xs text-text-secondary mt-2">Adelantos de repartidores: {formatCurrency(e.advances)}</p>
        )}
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: '#EDE9FE' }}>
        <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--brand)' }}>Distribución del servicio</p>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Administración 25%</span>
          <span className="font-bold text-text-primary">{formatCurrency(d.admin25)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Repartidores 75%</span>
          <span className="font-bold text-text-primary">{formatCurrency(d.drivers75)}</span>
        </div>
      </div>
    </div>
  );
}
