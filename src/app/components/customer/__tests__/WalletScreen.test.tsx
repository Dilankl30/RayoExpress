import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate }),
}));

import { WalletScreen } from '../WalletScreen';

function renderScreen() {
  return render(<WalletScreen />);
}

describe('WalletScreen', () => {
  it('renders balance section', () => {
    renderScreen();
    expect(screen.getByText('Saldo')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders empty transactions state', () => {
    renderScreen();
    expect(screen.getByText('No tienes movimientos')).toBeTruthy();
  });

  it('renders grupo familiar section', () => {
    renderScreen();
    expect(screen.getByText('Grupo familiar')).toBeTruthy();
  });
});
