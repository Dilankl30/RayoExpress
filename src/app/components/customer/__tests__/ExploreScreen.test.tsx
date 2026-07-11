import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({
    navigate: mockNavigate,
    user: { id: 'test-user-id', role: 'customer', full_name: 'Test Customer' },
  }),
}));

vi.mock('../../../../modules/cart/context/CartContext', () => ({
  useCart: () => ({
    cartCount: 2,
    cart: [],
    cartTotal: 0,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

const mocks = vi.hoisted(() => ({
  getStores: vi.fn(),
  getCategories: vi.fn(),
  getStoresInBounds: vi.fn(),
  getAddresses: vi.fn(),
}));

vi.mock('../../../../modules/stores/application/store-service', () => ({
  getStores: mocks.getStores,
  getCategories: mocks.getCategories,
  getStoresInBounds: mocks.getStoresInBounds,
}));

vi.mock('../../../../modules/client/application/client-service', () => ({
  getAddresses: mocks.getAddresses,
}));

import { ExploreScreen } from '../ExploreScreen';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/explore']}>
      <ExploreScreen />
    </MemoryRouter>,
  );
}

describe('ExploreScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderScreen();
    expect(screen.getByText('Cargando mapa interactivo...')).toBeTruthy();
  });
});
