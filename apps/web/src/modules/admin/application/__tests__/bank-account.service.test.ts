import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import {
  createBankAccount,
  deactivateBankAccount,
  listBankAccounts,
  updateBankAccount,
} from '../bank-account.service';

describe('bank-account.service (Fase 5, mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists seed accounts with a default', async () => {
    const accs = await listBankAccounts();
    expect(accs.length).toBeGreaterThanOrEqual(2);
    expect(accs.some((a) => a.is_default)).toBe(true);
  });

  it('rejects invalid input', async () => {
    await expect(createBankAccount({
      name: '', bank_name: 'Pichincha', account_type: 'corriente',
      account_number: '**** 1', holder_name: 'T',
    })).rejects.toThrow('nombre');
  });

  it('creates accounts and moves the default flag', async () => {
    const acc = await createBankAccount({
      name: 'Nueva', bank_name: 'Banco X', account_type: 'ahorros',
      account_number: '**** 9', holder_name: 'Titular', is_default: true,
    });
    expect(acc.is_default).toBe(true);
    const all = await listBankAccounts();
    expect(all.filter((a) => a.is_default)).toHaveLength(1);
  });

  it('deactivates accounts (soft delete, history preserved)', async () => {
    const accs = await listBankAccounts(false);
    const target = accs.find((a) => a.is_active)!;
    await deactivateBankAccount(target.id);
    const active = await listBankAccounts(true);
    expect(active.find((a) => a.id === target.id)).toBeUndefined();
  });

  it('updates account fields', async () => {
    const accs = await listBankAccounts(false);
    const updated = await updateBankAccount(accs[0].id, { holder_name: 'Nuevo Titular' });
    expect(updated.holder_name).toBe('Nuevo Titular');
  });
});
