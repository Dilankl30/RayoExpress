import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import { LiquidationsTab } from '../LiquidationsTab';

describe('LiquidationsTab settlement flow (Fase 7)', () => {
  it('calculates, saves and pays a driver settlement', async () => {
    render(<LiquidationsTab />);

    await waitFor(() => {
      expect(screen.getByText('Liquidación por período')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Calcular'));
    await waitFor(() => {
      expect(screen.getByText(/Neto a pagar/)).toBeTruthy();
    });

    fireEvent.click(screen.getByText('GUARDAR LIQUIDACIÓN'));
    await waitFor(() => {
      expect(screen.getByText('MARCAR PAGADA')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('MARCAR PAGADA'));
    await waitFor(() => {
      expect(screen.getByText('Pagada')).toBeTruthy();
    });
  });
});
