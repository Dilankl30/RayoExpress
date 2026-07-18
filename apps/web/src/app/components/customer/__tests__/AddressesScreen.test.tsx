import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { mockNavigate, mockUser, mockGetAddresses, mockCreateAddress, mockRemoveAddress } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUser: { id: 'u1' },
  mockGetAddresses: vi.fn(),
  mockCreateAddress: vi.fn(),
  mockRemoveAddress: vi.fn(),
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser, navigationParams: {} }),
}));

vi.mock('../../../../modules/client/application/client-service', () => ({
  MAX_CUSTOMER_ADDRESSES: 3,
  getAddresses: (...args: unknown[]) => mockGetAddresses(...args),
  createAddress: (...args: unknown[]) => mockCreateAddress(...args),
  removeAddress: (...args: unknown[]) => mockRemoveAddress(...args),
  markDefaultAddress: () => Promise.resolve([]),
}));

import { AddressesScreen } from '../AddressesScreen';

function renderScreen() {
  return render(<AddressesScreen />);
}

afterEach(() => {
  cleanup();
});

describe('AddressesScreen', () => {
  it('renders empty state when no addresses', async () => {
    mockGetAddresses.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('No tienes direcciones guardadas')).toBeTruthy();
  });

  it('shows address list when addresses exist', async () => {
    mockGetAddresses.mockResolvedValue([{ id: 'a1', title: 'Casa', line1: 'Av. Siempre Viva 123', details: '', is_default: false }]);
    renderScreen();
    expect(await screen.findByText('Av. Siempre Viva 123')).toBeTruthy();
  });

  it('opens location dialog with GPS and map options', async () => {
    mockGetAddresses.mockResolvedValue([]);
    renderScreen();
    await screen.findByText('No tienes direcciones guardadas');
    const addBtn = screen.getAllByText('Agregar dirección')[0];
    addBtn.click();
    await screen.findByText('Ingresa tu dirección');
    expect(screen.getByText('Mi ubicación actual')).toBeTruthy();
    expect(screen.getByText('Seleccionar en el mapa')).toBeTruthy();
  });
});
