import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate }),
}));

const mockAddresses: Array<{ id: string; title: string; line1: string; details: string }> = [];
let mockSetAddresses: (a: typeof mockAddresses) => void = () => {};

vi.mock('../customerLocalState', () => ({
  customerStorage: {
    getAddresses: () => mockAddresses,
    setAddresses: (a: typeof mockAddresses) => { mockSetAddresses(a); },
  },
}));

import { AddressesScreen } from '../AddressesScreen';

function renderScreen() {
  return render(<AddressesScreen />);
}

describe('AddressesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddresses.length = 0;
    mockSetAddresses = vi.fn();
  });

  it('renders empty state when no addresses', () => {
    renderScreen();
    expect(screen.getByText('No tienes direcciones guardadas')).toBeTruthy();
  });

  it('shows address list when addresses exist', () => {
    mockAddresses.push({ id: 'a1', title: 'Casa', line1: 'Av. Siempre Viva 123', details: '' });
    renderScreen();
    expect(screen.getByText('Av. Siempre Viva 123')).toBeTruthy();
  });

  it('opens dialog and adds new address', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Agregar direccion'));
    const input = screen.getByLabelText('Nueva direccion');
    fireEvent.change(input, { target: { value: 'Calle Nueva 456' } });
    fireEvent.click(screen.getByText('Guardar'));
    expect(mockSetAddresses).toHaveBeenCalled();
  });
});
