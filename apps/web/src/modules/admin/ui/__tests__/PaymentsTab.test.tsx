import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import { PaymentsTab } from '../PaymentsTab';

describe('PaymentsTab (Fase 5)', () => {
  it('shows pending payments with a visible pay action', async () => {
    render(<PaymentsTab />);
    await waitFor(() => {
      expect(screen.getByText('RE-000123')).toBeTruthy();
    });
    expect(screen.getByText('MARCAR PAGADO')).toBeTruthy();
    expect(screen.getByText('🔴 Pendiente')).toBeTruthy();
  });

  it('switches to paid and accounts views', async () => {
    render(<PaymentsTab />);
    await waitFor(() => {
      expect(screen.getByText('RE-000123')).toBeTruthy();
    });
    screen.getByText(/Pagados/).click();
    await waitFor(() => {
      expect(screen.getByText('Aún no hay pagos registrados.')).toBeTruthy();
    });
    screen.getByText('Cuentas').click();
    await waitFor(() => {
      expect(screen.getByText(/control interno/)).toBeTruthy();
    });
  });
});
