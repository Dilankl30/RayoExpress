import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => ({ from: vi.fn(), rpc: vi.fn(), auth: { getUser: async () => ({ data: {} }) } }),
}));

import { LiquidationsTab } from '../LiquidationsTab';
import { DailyEconomy } from '../DailyEconomy';

describe('LiquidationsTab (Fase 6)', () => {
  it('shows per-driver split without mixing values', async () => {
    render(<LiquidationsTab />);
    await waitFor(() => {
      expect(screen.getByText('Juan Carlos')).toBeTruthy();
    });
    expect(screen.getByText('Pedro López')).toBeTruthy();
    expect(screen.getByText('Por repartidor (hoy)')).toBeTruthy();
  });
});

describe('DailyEconomy (Fase 6)', () => {
  it('shows daily control with 25/75 distribution', async () => {
    render(<DailyEconomy />);
    await waitFor(() => {
      expect(screen.getByText(/Control diario/)).toBeTruthy();
    });
    expect(screen.getByText('Administración 25%')).toBeTruthy();
    expect(screen.getByText('Repartidores 75%')).toBeTruthy();
  });
});
