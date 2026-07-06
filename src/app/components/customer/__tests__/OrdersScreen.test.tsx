import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const { mockNavigate, mockUser, mockGetMyOrders } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUser: { id: 'u1' },
  mockGetMyOrders: vi.fn(),
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser }),
}));

vi.mock('../../../../modules/cart/context/CartContext', () => ({
  useCart: () => ({ cartCount: 0 }),
}));

vi.mock('../../../../modules/orders/application/order-service', () => ({
  getMyOrders: (...args: unknown[]) => mockGetMyOrders(...args),
}));

import { OrdersScreen } from '../OrdersScreen';

function renderScreen() {
  return render(<OrdersScreen />);
}

afterEach(() => {
  cleanup();
});

describe('OrdersScreen', () => {
  it('renders empty state when no orders', async () => {
    mockGetMyOrders.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('No tienes pedidos en curso')).toBeTruthy();
  });

  it('shows filter bottom sheet', async () => {
    mockGetMyOrders.mockResolvedValue([]);
    renderScreen();
    await screen.findByText('Mis Pedidos');
    fireEvent.click(screen.getByText('Historial'));
    expect(screen.getByText('Filtros')).toBeTruthy();
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.getByText('Filtrar pedidos')).toBeTruthy();
  });

  it('renders orders when available', async () => {
    mockGetMyOrders.mockResolvedValue([
      {
        id: 'o1',
        status: 'active',
        total: 15.99,
        created_at: new Date().toISOString(),
        store: { name: 'BK', emoji: '🍔' },
        order_items: [{ product_name: 'Whopper', quantity: 2 }],
      },
    ]);
    renderScreen();
    expect(await screen.findByText('BK')).toBeTruthy();
    expect(screen.getByText('$15.99')).toBeTruthy();
  });
});
