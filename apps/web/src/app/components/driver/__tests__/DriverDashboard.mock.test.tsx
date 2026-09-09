import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Sin backend: el dashboard del repartidor NO debe reventar (regresión:
// getSupabase() sin guard en la suscripción realtime rompía el montaje).
vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  getSupabase: () => {
    throw new Error('Supabase client not initialized.');
  },
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mock-driver', full_name: 'Repartidor Demo', phone: null, role: 'driver', avatar_url: null, is_suspended: false },
    loading: false,
    screen: 'driver',
    navigate: vi.fn(),
    login: vi.fn(),
    mockLogin: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}));

vi.mock('../../../../modules/notifications/ui/NotificationBell', () => ({
  NotificationBell: () => <div />,
}));

vi.mock('../../../../modules/chat/ui/OrderChat', () => ({
  OrderChat: () => <div />,
}));

import { DriverDashboard } from '../DriverDashboard';

describe('DriverDashboard mock mode (responsive regression)', () => {
  it('mounts without crashing and shows service toggle', async () => {
    render(
      <MemoryRouter>
        <DriverDashboard />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Estado de servicio')).toBeTruthy();
    });
    expect(screen.queryByText('Algo salio mal')).toBeNull();
  });
});
