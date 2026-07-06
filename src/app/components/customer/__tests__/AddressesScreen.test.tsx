import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

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

  it('opens dialog and adds new address', async () => {
    mockGetAddresses.mockResolvedValue([]);
    mockCreateAddress.mockResolvedValue([{ id: 'a1', title: 'Dirección guardada', line1: 'Calle Nueva 456', details: '', is_default: true }]);
    renderScreen();
    await screen.findByText('No tienes direcciones guardadas');
    const addBtn = screen.getByText('Agregar dirección');
    addBtn.click();
    await screen.findByText('Nueva dirección');
    const input = screen.getByLabelText('Dirección');
    fireEvent.change(input, { target: { value: 'Calle Nueva 456' } });
    const saveBtn = screen.getByText('Guardar');
    saveBtn.click();
    expect(mockCreateAddress).toHaveBeenCalled();
  });
});
