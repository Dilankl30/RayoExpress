import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { getDailySummary, type DailySummary } from '../application/daily-summary.service';
import {
  createLiquidation,
  getDriverSettlement,
  listLiquidations,
  markLiquidationPaid,
  type DriverSettlement,
  type LiquidationRecord,
} from '../application/liquidation.service';
import { getAllDrivers, type AdminDriver } from '../application/admin.service';
import { DailyEconomy } from './DailyEconomy';

function formatCurrency(n: number): string {
  return Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function dayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusBadge(s: string): string {
  if (s === 'paid') return 'bg-green-100 text-green-700';
  if (s === 'cancelled') return 'bg-surface-hover text-text-secondary';
  return 'bg-yellow-100 text-yellow-700';
}

/**
 * Liquidaciones (Fase 6: resumen diario + por repartidor.
 * Fase 7: liquidación formal por período con saldos y cierre).
 */
export function LiquidationsTab() {
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [driverId, setDriverId] = useState('');
  const [start, setStart] = useState(() => dayKey(-6));
  const [end, setEnd] = useState(() => dayKey(0));
  const [settlement, setSettlement] = useState<DriverSettlement | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<LiquidationRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');

  useEffect(() => {
    getDailySummary().then(setSummary).catch(() => {});
    getAllDrivers().then((d) => {
      setDrivers(d);
      if (d.length > 0) setDriverId(d[0].driver_id);
    }).catch(() => {});
  }, []);

  const reloadHistory = async (driver?: string) => {
    try {
      setHistory(await listLiquidations(driver || undefined));
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    void reloadHistory(historyFilter || undefined);
  }, [historyFilter]);

  const calculate = async () => {
    setCalcLoading(true);
    setCalcError(null);
    setSettlement(null);
    try {
      setSettlement(await getDriverSettlement(driverId, start, end));
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'No se pudo calcular.');
    } finally {
      setCalcLoading(false);
    }
  };

  const save = async () => {
    if (!settlement) return;
    setSaving(true);
    try {
      await createLiquidation(settlement.driver_id, settlement.period_start, settlement.period_end, notes);
      setNotes('');
      setSettlement(null);
      await reloadHistory(historyFilter || undefined);
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const pay = async (id: string) => {
    try {
      await markLiquidationPaid(id);
      await reloadHistory(historyFilter || undefined);
    } catch {
      /* noop */
    }
  };

  const rows = summary?.byDriver ?? [];
  const t = settlement?.totals;

  return (
    <div className="space-y-3">
      <DailyEconomy />

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="font-bold text-text-primary mb-1">Por repartidor (hoy)</p>
        <p className="text-xs text-text-secondary mb-3">Servicios del día y participación 75%. Sin mezclar valores.</p>
        {rows.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-6">Sin entregas registradas hoy.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.driver_id ?? 'unassigned'} className="rounded-xl bg-surface border border-border-light p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-text-primary text-sm">{r.driver_name}</p>
                    <p className="text-xs text-text-secondary">Pedidos: {r.orders}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Servicios: {formatCurrency(r.services)}</p>
                    <p className="font-bold text-sm" style={{ color: '#22C55E' }}>75%: {formatCurrency(r.share75)}</p>
                  </div>
                </div>
                {r.advances > 0 && (
                  <p className="text-xs text-text-secondary mt-1">Adelantos: {formatCurrency(r.advances)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
        <p className="font-bold text-text-primary">Liquidación por período</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={driverId} onChange={(e) => { setDriverId(e.target.value); setSettlement(null); }}
            className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none">
            <option value="">Repartidor…</option>
            {drivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>{d.full_name || d.driver_id}</option>
            ))}
          </select>
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
          <input type="date" value={end} min={start} max={dayKey(0)} onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
          <button type="button" onClick={calculate} disabled={calcLoading || !driverId}
            className="py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)' }}>
            {calcLoading ? 'Calculando…' : 'Calcular'}
          </button>
        </div>

        {calcError && <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-700">{calcError}</div>}

        {settlement && t && (
          <div className="rounded-xl bg-surface border border-border-light p-3 space-y-2">
            <p className="font-semibold text-text-primary text-sm">
              {settlement.driver_name} · {settlement.period_start} → {settlement.period_end}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Pedidos realizados</span><span className="font-bold">{t.orders}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Servicios</span><span className="font-bold">{formatCurrency(t.services)}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Participación 75%</span><span className="font-bold" style={{ color: '#22C55E' }}>{formatCurrency(t.driver75)}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Adelantos</span><span className="font-bold">{formatCurrency(t.advances)}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Efectivo cobrado</span><span className="font-bold">-{formatCurrency(t.collected)}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Saldo anterior</span><span className="font-bold">{formatCurrency(t.previous)}</span></div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border-light">
              <span className="text-sm font-bold">Neto a pagar</span>
              <span className="text-lg font-extrabold" style={{ color: t.net >= 0 ? '#22C55E' : '#DC2626' }}>
                {formatCurrency(t.net)}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t.net >= 0 ? 'El admin le paga al repartidor.' : 'El repartidor debe entregar la diferencia al admin.'}
            </p>
            {settlement.orders.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs space-y-1 pt-1">
                {settlement.orders.map((o) => (
                  <div key={o.id} className="flex justify-between text-text-secondary">
                    <span className="font-mono">{o.tracking_code || o.id.slice(0, 8)}</span>
                    <span>S/{Number(o.service_fee).toFixed(2)} · A/{Number(o.driver_advance).toFixed(2)} · {o.payment_method}</span>
                  </div>
                ))}
              </div>
            )}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-card text-text-primary outline-none" />
            <button type="button" onClick={save} disabled={saving}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)' }}>
              {saving ? 'Guardando…' : <><Check size={16} /> GUARDAR LIQUIDACIÓN</>}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-text-primary">Historial</p>
          <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}
            className="px-2 py-1.5 rounded-xl border border-border text-xs bg-surface text-text-secondary outline-none">
            <option value="">Todos</option>
            {drivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>{d.full_name || d.driver_id}</option>
            ))}
          </select>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-6">Sin liquidaciones guardadas.</p>
        ) : (
          <div className="space-y-2">
            {history.map((l) => (
              <div key={l.id} className="rounded-xl bg-surface border border-border-light p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{l.driver_name || 'Repartidor'}</p>
                    <p className="text-xs text-text-secondary">{l.period_start} → {l.period_end}</p>
                    <p className="text-xs text-text-secondary">
                      Servicios {formatCurrency(l.total_service_fees)} · 75% {formatCurrency(l.driver_share)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: l.net_payable >= 0 ? '#22C55E' : '#DC2626' }}>
                      {formatCurrency(l.net_payable)}
                    </p>
                    <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusBadge(l.status)}`}>
                      {l.status === 'paid' ? 'Pagada' : l.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                {l.status === 'pending' && (
                  <button type="button" onClick={() => void pay(l.id)}
                    className="mt-2 w-full py-2 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: '#22C55E' }}>
                    MARCAR PAGADA
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
