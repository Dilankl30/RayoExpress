import { useEffect, useState } from 'react';
import { getDailySummary, type DailySummary } from '../application/daily-summary.service';
import { DailyEconomy } from './DailyEconomy';

function formatCurrency(n: number): string {
  return Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

/**
 * Liquidaciones (Fase 6: resumen por repartidor. Fase 7: saldos, pagos y
 * cierre formal por período).
 */
export function LiquidationsTab() {
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => {
    getDailySummary().then(setSummary).catch(() => {});
  }, []);

  const rows = summary?.byDriver ?? [];

  return (
    <div className="space-y-3">
      <DailyEconomy />

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="font-bold text-text-primary mb-1">Por repartidor</p>
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
    </div>
  );
}
