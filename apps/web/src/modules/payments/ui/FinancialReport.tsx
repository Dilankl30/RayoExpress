import { useState, useEffect } from 'react';
import { getStorePayments } from '../application/payment.service';
import type { PaymentTransaction } from '../application/payment.service';

interface Props {
  storeId: string;
}

export function FinancialReport({ storeId }: Props) {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStorePayments(storeId);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]);

  const now = new Date();
  const filtered = payments.filter((p) => {
    if (period === 'all') return true;
    const d = new Date(p.created_at);
    const diff = now.getTime() - d.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return period === 'week' ? days <= 7 : days <= 30;
  });

  const verifiedPayments = filtered.filter((p) => p.verified);
  const totalRevenue = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOrders = filtered.length;
  const pendingCount = filtered.filter((p) => !p.verified).length;

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['week', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-medium ${period === p ? 'text-white shadow-md' : 'bg-surface-hover text-text-secondary'}`}
            style={period === p ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>${totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-text-secondary">Ingresos verificados</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{totalOrders}</p>
          <p className="text-xs text-text-secondary">Transacciones</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-text-secondary">Pendientes</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <p className="text-2xl font-bold text-text-primary">{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}</p>
          <p className="text-xs text-text-secondary">Promedio por pedido</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
        <p className="text-sm font-medium text-text-primary mb-3">Historial de transacciones</p>
        {filtered.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-4">Sin transacciones en este período</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.method === 'cash' ? '💵' : p.method === 'transfer' ? '📱' : '💳'}</span>
                  <div>
                    <p className="text-sm text-text-primary capitalize">{p.method}</p>
                    <p className="text-xs text-text-secondary">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">${p.amount.toFixed(2)}</p>
                  <span className={`text-xs ${p.verified ? 'text-success' : 'text-warning'}`}>
                    {p.verified ? 'Verificado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
