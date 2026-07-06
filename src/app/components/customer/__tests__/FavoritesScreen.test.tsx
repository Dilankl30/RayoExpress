import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate }),
}));

const mockFavorites: Array<{ id: string; kind: 'store' | 'product'; name: string; subtitle: string; emoji: string; price?: number }> = [];

vi.mock('../customerLocalState', () => ({
  customerStorage: {
    getFavorites: () => mockFavorites,
  },
}));

import { FavoritesScreen } from '../FavoritesScreen';

function renderScreen() {
  return render(<FavoritesScreen />);
}

describe('FavoritesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFavorites.length = 0;
  });

  it('renders empty state with CTA button', () => {
    renderScreen();
    expect(screen.getByText('Aun no tienes favoritos')).toBeTruthy();
    fireEvent.click(screen.getByText('Buscar productos'));
    expect(mockNavigate).toHaveBeenCalledWith('home');
  });

  it('shows store tab by default', () => {
    mockFavorites.push({ id: 's1', kind: 'store', name: 'BK', subtitle: 'Burgers', emoji: '🍔' });
    renderScreen();
    expect(screen.getByText('BK')).toBeTruthy();
  });

  it('switches between store and product tabs', () => {
    mockFavorites.push(
      { id: 's1', kind: 'store', name: 'BK', subtitle: 'Burgers', emoji: '🍔' },
      { id: 'p1', kind: 'product', name: 'Whopper', subtitle: 'BK', emoji: '🍔', price: 5.99 },
    );
    renderScreen();
    expect(screen.getByText('BK')).toBeTruthy();
    fireEvent.click(screen.getByText('Productos'));
    expect(screen.getByText('Whopper')).toBeTruthy();
  });
});
