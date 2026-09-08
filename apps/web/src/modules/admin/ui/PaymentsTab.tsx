import { useEffect, useState } from 'react';
import { Check, X, Upload, Landmark } from 'lucide-react';
import {
  getPaidOrders,
  getPendingPaymentOrders,
  markOrderPaid,
  type AdminPaymentMethod,
  type PaidOrder,
  type PendingPaymentOrder,
} from '../application/payment-admin.service';
import { listBankAccounts, type BankAccount } from '../application/bank-account.service';
import { BankAccountsManager } from './BankAccountsManager';

type SubTab = 'pending' | 'paid' | 'accounts';

function formatCurrency(n: number): string {
  return Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function methodLabel(m: AdminPaymentMethod): string {
  return m === 'cash' ? 'Efectivo' : 'Transferencia';
}

function MarkPaidModal({ order, onClose, onDone }: {
  order: PendingPaymentOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<AdminPaymentMethod>('cash');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBankAccounts(true).then((accs) => {
      setAccounts(accs);
      const def = accs.find((a) => a.is_default);
      if (def) setAccountId(def.id);
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await markOrderPaid(order.id, method, {
        accountId: method === 'transfer' ? accountId : undefined,
        reference: method === 'transfer' ? reference : undefined,
        receiptFile: receipt ?? undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-text-primary">Marcar pago recibido</h3>
            <p className="text-xs text-text-secondary font-mono">{order.tracking_code || order.id.slice(0, 8)} · {formatCurrency(order.total)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-surface-hover text-text-secondary" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-3">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Método</label>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'transfer'] as AdminPaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border ${method === m ? 'text-white border-transparent' : 'bg-surface text-text-secondary border-border'}`}
                  style={method === m ? { backgroundColor: 'var(--brand)' } : {}}
                >
                  {methodLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {method === 'transfer' && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Cuenta receptora *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none"
                >
                  <option value="">Seleccionar cuenta…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.bank_name} {a.account_number}
                    </option>
                  ))}
                </select>
                {accounts.length === 0 && (
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <Landmark size={12} /> Registra una cuenta en la pestaña Cuentas.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Referencia (opcional)</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Nro. comprobante / referencia"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Comprobante (opcional)</label>
                <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-text-secondary cursor-pointer bg-surface">
                  <Upload size={16} />
                  <span className="truncate">{receipt ? receipt.name : 'Subir imagen o PDF (máx 10 MB)'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#22C55E' }}
          >
            {saving ? 'Guardando…' : <><Check size={16} /> PAGO RECIBIDO</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentsTab() {
  const [sub, setSub] = useState<SubTab>('pending');
  const [pending, setPending] = useState<PendingPaymentOrder[]>([]);
  const [paid, setPaid] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PendingPaymentOrder | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([getPendingPaymentOrders(), getPaidOrders()]);
      setPending(p);
      setPaid(d);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {([
          { key: 'pending', label: `Pendientes (${pending.length})` },
          { key: 'paid', label: `Pagados (${paid.length})` },
          { key: 'accounts', label: 'Cuentas' },
        ] as { key: SubTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSub(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${sub === t.key ? 'text-white' : 'bg-surface-hover text-text-secondary'}`}
            style={sub === t.key ? { backgroundColor: 'var(--brand)' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sub === 'pending' ? (
        <div className="space-y-2">
          {pending.length === 0 && <p className="text-xs text-text-secondary text-center py-10">Sin pagos pendientes 🎉</p>}
          {pending.map((o) => (
            <div key={o.id} className="bg-card rounded-2xl p-4 shadow-sm border-l-4 border-red-500">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--brand)' }}>{o.tracking_code || o.id.slice(0, 8)}</p>
                  <p className="text-sm text-text-primary truncate">{o.customer_name || 'Cliente'}</p>
                  <p className="text-xs text-text-secondary">
                    {o.driver_name ? `🛵 ${o.driver_name} · ` : ''}{formatDate(o.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-text-primary">{formatCurrency(o.total)}</p>
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">🔴 Pendiente</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(o)}
                className="mt-3 w-full py-2 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: '#22C55E' }}
              >
                MARCAR PAGADO
              </button>
            </div>
          ))}
        </div>
      ) : sub === 'paid' ? (
        <div className="space-y-2">
          {paid.length === 0 && <p className="text-xs text-text-secondary text-center py-10">Aún no hay pagos registrados.</p>}
          {paid.map((o) => (
            <div key={o.id} className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--brand)' }}>{o.tracking_code || o.id.slice(0, 8)}</p>
                  <p className="text-sm text-text-primary truncate">{o.customer_name || 'Cliente'}</p>
                  <p className="text-xs text-text-secondary">
                    {methodLabel(o.payment_method)}
                    {o.account_name ? ` · ${o.account_name}` : ''}
                    {o.transfer_receipt_url ? ' · 🧾 comprobante' : ''}
                    {' · '}{formatDate(o.updated_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold" style={{ color: '#22C55E' }}>{formatCurrency(o.total)}</p>
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Pagado</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BankAccountsManager />
      )}

      {selected && (
        <MarkPaidModal
          order={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); void reload(); }}
        />
      )}
    </div>
  );
}
