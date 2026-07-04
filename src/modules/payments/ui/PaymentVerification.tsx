import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { getStorePayments, verifyPayment } from '../application/payment.service';
import type { PaymentTransaction } from '../application/payment.service';

interface Props {
  storeId: string;
  userId: string;
}

export function PaymentVerification({ storeId, userId }: Props) {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleVerify = async (id: string, verified: boolean) => {
    await verifyPayment(id, userId, verified);
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (payments.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 text-center shadow-sm border border-border-light">
        <p className="text-text-secondary text-sm">Sin pagos pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{p.method === 'cash' ? '💵' : p.method === 'transfer' ? '📱' : '💳'}</span>
              <p className="text-sm font-medium text-text-primary capitalize">{p.method}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.verified ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
              {p.verified ? 'Verificado' : 'Pendiente'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">${p.amount.toFixed(2)}</span>
            <span className="text-text-secondary text-xs">{new Date(p.created_at).toLocaleDateString()}</span>
          </div>
          {p.receipt_url && (
            <div className="mt-2 flex items-center gap-2">
              <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand flex items-center gap-1">
                <ExternalLink size={12} /> Ver comprobante
              </a>
            </div>
          )}
          {!p.verified && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleVerify(p.id, true)}
                className="flex-1 py-2 rounded-xl text-xs font-medium bg-success-light text-success flex items-center justify-center gap-1"
              >
                <CheckCircle size={14} /> Aprobar
              </button>
              <button
                onClick={() => handleVerify(p.id, false)}
                className="flex-1 py-2 rounded-xl text-xs font-medium bg-danger-light text-danger flex items-center justify-center gap-1"
              >
                <XCircle size={14} /> Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
