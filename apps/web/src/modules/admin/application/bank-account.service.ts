import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_type: 'corriente' | 'ahorros';
  account_number: string;
  holder_name: string;
  holder_id: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface BankAccountInput {
  name: string;
  bank_name: string;
  account_type: 'corriente' | 'ahorros';
  account_number: string;
  holder_name: string;
  holder_id?: string;
  is_default?: boolean;
}

// Mock para desarrollo sin Supabase.
let mockSeq = 3;
const mockAccounts: BankAccount[] = [
  {
    id: 'mock-acc-1',
    name: 'Cuenta Admin Principal',
    bank_name: 'Pichincha',
    account_type: 'corriente',
    account_number: '**** 4821',
    holder_name: 'Administrador RayoExpress',
    holder_id: null,
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-acc-2',
    name: 'Cuenta Repartos',
    bank_name: 'Banco Guayaquil',
    account_type: 'ahorros',
    account_number: '**** 7734',
    holder_name: 'Juan Carlos',
    holder_id: null,
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
  },
];

function requireValid(input: BankAccountInput): void {
  if (!input.name.trim()) throw new Error('El nombre de la cuenta es requerido.');
  if (!input.bank_name.trim()) throw new Error('El banco es requerido.');
  if (!input.account_number.trim()) throw new Error('El número o alias de la cuenta es requerido.');
  if (!input.holder_name.trim()) throw new Error('El titular es requerido.');
  if (input.account_type !== 'corriente' && input.account_type !== 'ahorros') {
    throw new Error('Tipo de cuenta inválido.');
  }
}

export async function listBankAccounts(activeOnly = true): Promise<BankAccount[]> {
  if (!isSupabaseReady) {
    return mockAccounts.filter((a) => !activeOnly || a.is_active);
  }
  const supabase = getSupabase();
  let query = supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: true });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BankAccount[];
}

export async function createBankAccount(input: BankAccountInput): Promise<BankAccount> {
  requireValid(input);
  if (!isSupabaseReady) {
    const acc: BankAccount = {
      id: `mock-acc-${mockSeq++}`,
      name: input.name.trim(),
      bank_name: input.bank_name.trim(),
      account_type: input.account_type,
      account_number: input.account_number.trim(),
      holder_name: input.holder_name.trim(),
      holder_id: input.holder_id?.trim() || null,
      is_active: true,
      is_default: !!input.is_default,
      created_at: new Date().toISOString(),
    };
    if (acc.is_default) mockAccounts.forEach((a) => { a.is_default = false; });
    mockAccounts.push(acc);
    return acc;
  }
  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      name: input.name.trim(),
      bank_name: input.bank_name.trim(),
      account_type: input.account_type,
      account_number: input.account_number.trim(),
      holder_name: input.holder_name.trim(),
      holder_id: input.holder_id?.trim() || null,
      is_default: !!input.is_default,
      created_by: authData.user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  const acc = data as BankAccount;
  if (acc.is_default) {
    await supabase.from('bank_accounts').update({ is_default: false }).neq('id', acc.id);
  }
  return acc;
}

export async function updateBankAccount(id: string, patch: Partial<BankAccountInput> & { is_active?: boolean }): Promise<BankAccount> {
  if (!isSupabaseReady) {
    const acc = mockAccounts.find((a) => a.id === id);
    if (!acc) throw new Error('Cuenta no encontrada.');
    Object.assign(acc, {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.bank_name !== undefined ? { bank_name: patch.bank_name.trim() } : {}),
      ...(patch.account_type !== undefined ? { account_type: patch.account_type } : {}),
      ...(patch.account_number !== undefined ? { account_number: patch.account_number.trim() } : {}),
      ...(patch.holder_name !== undefined ? { holder_name: patch.holder_name.trim() } : {}),
      ...(patch.holder_id !== undefined ? { holder_id: patch.holder_id?.trim() || null } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
    });
    if (patch.is_default) {
      mockAccounts.forEach((a) => { a.is_default = a.id === id; });
      acc.is_default = true;
    }
    return acc;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bank_accounts')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.bank_name !== undefined ? { bank_name: patch.bank_name.trim() } : {}),
      ...(patch.account_type !== undefined ? { account_type: patch.account_type } : {}),
      ...(patch.account_number !== undefined ? { account_number: patch.account_number.trim() } : {}),
      ...(patch.holder_name !== undefined ? { holder_name: patch.holder_name.trim() } : {}),
      ...(patch.holder_id !== undefined ? { holder_id: patch.holder_id?.trim() || null } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
      ...(patch.is_default !== undefined ? { is_default: patch.is_default } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const acc = data as BankAccount;
  if (patch.is_default) {
    await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id);
  }
  return acc;
}

export async function deactivateBankAccount(id: string): Promise<void> {
  await updateBankAccount(id, { is_active: false });
}
