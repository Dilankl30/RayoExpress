import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate }),
}));

vi.mock('../../../../modules/cart/context/CartContext', () => ({
  useCart: vi.fn(),
}));

vi.mock('../../../../modules/orders/application/order-service', () => ({
  createOrder: vi.fn(),
}));

vi.mock('../../../../modules/payments/application/payment.service', () => ({
  uploadReceipt: vi.fn(),
  savePaymentReceipt: vi.fn(),
}));

import { useCart } from '../../../../modules/cart/context/CartContext';
import { CartScreen } from '../CartScreen';

function renderCartScreen() {
  return render(<CartScreen />);
}

describe('CartScreen', () => {
  it('renders empty cart message when cart is empty', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: [],
      cartCount: 0,
      cartTotal: 0,
      cartStore: null,
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    renderCartScreen();

    expect(screen.getByText('Tu carrito está vacío')).toBeTruthy();
  });

  it('renders items when cart has products', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: [
        { id: 'p1', name: 'Whopper', price: 5.99, quantity: 2, emoji: '🍔', storeId: 's1', storeName: 'BK' },
        { id: 'p2', name: 'Papas', price: 2.99, quantity: 1, emoji: '🍟', storeId: 's1', storeName: 'BK' },
      ],
      cartCount: 3,
      cartTotal: 14.97,
      cartStore: 's1',
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    renderCartScreen();

    expect(screen.getByText('Whopper')).toBeTruthy();
    expect(screen.getByText('Papas')).toBeTruthy();
    expect(screen.getByText('3 productos')).toBeTruthy();
  });

  it('displays the correct total', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: [
        { id: 'p1', name: 'Whopper', price: 5.99, quantity: 1, emoji: '🍔', storeId: 's1', storeName: 'BK' },
      ],
      cartCount: 1,
      cartTotal: 5.99,
      cartStore: 's1',
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    renderCartScreen();

    const total = 5.99 + 1.5 + (5.99 * 0.12);
    expect(screen.getByText(`$${total.toFixed(2)}`)).toBeTruthy();
  });
});
