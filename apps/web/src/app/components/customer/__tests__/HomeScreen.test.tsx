import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate }),
}));

vi.mock('../../../../modules/cart/context/CartContext', () => ({
  useCart: () => ({ cartCount: 0, addToCart: vi.fn() }),
}));

vi.mock('../../../../modules/notifications/ui/NotificationBell', () => ({
  NotificationBell: () => null,
}));

const mocks = vi.hoisted(() => ({
  getStores: vi.fn(),
  getCategories: vi.fn(),
  getProductsByStore: vi.fn(),
}));

vi.mock('../../../../modules/stores/application/store-service', () => mocks);

import { HomeScreen } from '../HomeScreen';

interface StoreMock {
  id: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  delivery_fee?: number | null;
  cover_color?: string | null;
  rating?: number | null;
  delivery?: string | null;
  fee?: number | null;
}

interface CategoryMock {
  id: string;
  name: string;
  emoji?: string | null;
  bg_color?: string | null;
  color?: string | null;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <HomeScreen />
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner initially', () => {
    renderScreen();
    expect(screen.getByText('Cargando tiendas...')).toBeTruthy();
  });

  it('renders error state with retry button when load fails', async () => {
    mocks.getStores.mockRejectedValue(new Error('fail'));
    mocks.getCategories.mockRejectedValue(new Error('fail'));

    renderScreen();
    await waitFor(() => {
      expect(screen.getByText(/No pudimos cargar/)).toBeTruthy();
    });
  });

  it('renders stores and categories after loading', async () => {
    const store = {
      id: 's1',
      name: 'BK',
      emoji: '🍔',
      description: 'Burgers',
      delivery_fee: 0,
      cover_color: '#000',
      rating: 4.6,
      delivery: '15-35 min',
      fee: 0,
    } satisfies StoreMock;

    const category = {
      id: 'c1',
      name: 'Comida',
      emoji: '🍕',
      bg_color: '#fff',
      color: '#111',
    } satisfies CategoryMock;

    mocks.getStores.mockResolvedValue([store]);
    mocks.getCategories.mockResolvedValue([category]);
    mocks.getProductsByStore.mockResolvedValue([]);

    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('BK')).toBeTruthy();
    });
  });
});
