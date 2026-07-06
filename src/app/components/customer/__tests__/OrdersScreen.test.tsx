import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockUser = { id: 'u1' };
const mockGetMyOrders = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser }),
}));

vi.mock('../../../../modules/orders/application/order-service', () => ({
  getMyOrders: (...args: unknown[]) => mockGetMyOrders(...args),
}));

import { OrdersScreen } from '../OrdersScreen';

function renderScreen() {
  return render(<OrdersScreen />);
}

describe('OrdersScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyOrders.mockResolvedValue([]);
  });

  it('renders empty state when no orders', async () => {
    renderScreen();
    expect(screen.getByText('No encontramos pedidos para estos filtros')).toBeTruthy();
  });

  it('shows filter bottom sheet', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.getByText('Filtrar por')).toBeTruthy();
  });

  it('toggles between delivered and cancelled tabs', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Cancelados'));
    expect(screen.getByText('No encontramos pedidos para estos filtros')).toBeTruthy();
  });

  it('renders orders when available', async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        id: 'o1',
        status: 'delivered',
        total: 15.99,
        created_at: new Date().toISOString(),
        store: { name: 'BK', emoji: '🍔' },
        order_items: [{ product_name: 'Whopper', quantity: 2 }],
      },
    ]);
    renderScreen();
    await vi.waitFor(() => {
      expect(screen.getByText('BK')).toBeTruthy();
    });
    expect(screen.getByText('$15.99')).toBeTruthy();
  });
});
