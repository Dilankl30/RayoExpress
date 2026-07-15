import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const { mockNavigate, mockUser, mockGetFavorites, mockToggleFavorite } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUser: { id: 'u1' },
  mockGetFavorites: vi.fn(),
  mockToggleFavorite: vi.fn(),
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser }),
}));

vi.mock('../../../../modules/cart/context/CartContext', () => ({
  useCart: () => ({ cartCount: 0 }),
}));

vi.mock('../../../../modules/client/application/client-service', () => ({
  getFavorites: (...args: unknown[]) => mockGetFavorites(...args),
  toggleFavorite: (...args: unknown[]) => mockToggleFavorite(...args),
}));

import { FavoritesScreen } from '../FavoritesScreen';

afterEach(() => {
  cleanup();
});

describe('FavoritesScreen', () => {
  it('shows store tab by default', async () => {
    mockGetFavorites.mockResolvedValue([{ id: 's1', kind: 'store', name: 'BK', subtitle: 'Burgers', emoji: '🍔' }]);
    render(<FavoritesScreen />);
    expect(await screen.findByText('BK')).toBeTruthy();
  });

  it('switches between store and product tabs', async () => {
    mockGetFavorites.mockResolvedValue([
      { id: 's1', kind: 'store', name: 'BK', subtitle: 'Burgers', emoji: '🍔' },
      { id: 'p1', kind: 'product', name: 'Whopper', subtitle: 'BK', emoji: '🍔', price: 5.99 },
    ]);
    render(<FavoritesScreen />);
    expect(await screen.findByText('BK')).toBeTruthy();
    const productTab = await screen.findByText('Productos');
    fireEvent.click(productTab);
    expect(await screen.findByText('Whopper')).toBeTruthy();
  });

  it('renders empty state with CTA button', async () => {
    mockGetFavorites.mockResolvedValue([]);
    render(<FavoritesScreen />);
    const btn = await screen.findByText('Explorar');
    btn.click();
    expect(mockNavigate).toHaveBeenCalledWith('home');
  });
});
