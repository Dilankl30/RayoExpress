import { useEffect, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import {
  createBankAccount,
  deactivateBankAccount,
  listBankAccounts,
  updateBankAccount,
  type BankAccount,
  type BankAccountInput,
} from '../application/bank-account.service';

const EMPTY: BankAccountInput = {
  name: '',
  bank_name: '',
  account_type: 'corriente',
  account_number: '',
  holder_name: '',
  holder_id: '',
  is_default: false,
};

export function BankAccountsManager() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BankAccountInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setAccounts(await listBankAccounts(false));
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createBankAccount(form);
      setForm(EMPTY);
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDefault = async (acc: BankAccount) => {
    if (acc.is_default) return;
    try {
      await updateBankAccount(acc.id, { is_default: true });
      await reload();
    } catch {
      /* noop */
    }
  };

  const deactivate = async (acc: BankAccount) => {
    try {
      await deactivateBankAccount(acc.id);
      await reload();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-xs text-text-secondary">Cuentas receptoras (control interno, el cliente nunca las ve).</p>
        <button
          type="button"
          onClick={() => { setShowForm((s) => !s); setError(null); }}
          className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Plus size={14} /> Cuenta
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card rounded-2xl p-4 shadow-sm border border-border-light space-y-3">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej: Cuenta Admin)" required
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
            <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Banco (ej: Pichincha)" required
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
            <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value as 'corriente' | 'ahorros' })}
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none">
              <option value="corriente">Cuenta corriente</option>
              <option value="ahorros">Cuenta de ahorros</option>
            </select>
            <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="Número / alias (ej: **** 4821)" required
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
            <input value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} placeholder="Titular" required
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
            <input value={form.holder_id || ''} onChange={(e) => setForm({ ...form, holder_id: e.target.value })} placeholder="Cédula/RUC (opcional)"
              className="px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary outline-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            Usar como cuenta por defecto
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-border text-sm text-text-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: 'var(--brand)' }}>
              {saving ? 'Guardando…' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-xs text-text-secondary text-center py-8">Sin cuentas registradas.</p>
      ) : (
        accounts.map((a) => (
          <div key={a.id} className={`bg-card rounded-2xl p-4 shadow-sm ${a.is_active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-sm flex items-center gap-2">
                  {a.name}
                  {a.is_default && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">Por defecto</span>
                  )}
                  {!a.is_active && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary font-bold">Inactiva</span>
                  )}
                </p>
                <p className="text-xs text-text-secondary">{a.bank_name} · {a.account_type} · {a.account_number}</p>
                <p className="text-xs text-text-secondary">Titular: {a.holder_name}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {a.is_active && !a.is_default && (
                  <button type="button" onClick={() => void toggleDefault(a)} title="Marcar por defecto"
                    className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:text-brand">
                    <Star size={14} />
                  </button>
                )}
                {a.is_active && (
                  <button type="button" onClick={() => void deactivate(a)} title="Desactivar"
                    className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
