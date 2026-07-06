import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockSetUser = vi.fn();
const mockUser = { id: 'u1', full_name: 'Juan Perez' };
const store: Record<string, string> = {};

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser, setUser: mockSetUser }),
}));

import { PersonalInfoScreen } from '../PersonalInfoScreen';

function renderScreen() {
  return render(<PersonalInfoScreen />);
}

describe('PersonalInfoScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(store).forEach(k => delete store[k]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      length: 0,
      key: () => null,
    });
  });

  it('renders form fields with user name pre-filled', () => {
    renderScreen();
    expect(screen.getByDisplayValue('Juan')).toBeTruthy();
    expect(screen.getByDisplayValue('Perez')).toBeTruthy();
  });

  it('saves name and navigates back on save', () => {
    renderScreen();
    const firstName = screen.getByLabelText('Nombre');
    fireEvent.change(firstName, { target: { value: 'Pedro' } });
    fireEvent.click(screen.getByText('Guardar datos'));
    expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Pedro Perez' }));
    expect(mockNavigate).toHaveBeenCalledWith('profile');
  });

  it('disables save when first name is empty', () => {
    renderScreen();
    const firstName = screen.getByLabelText('Nombre');
    fireEvent.change(firstName, { target: { value: '' } });
    expect(screen.getByText('Guardar datos')).toBeDisabled();
  });

  it('persists birthDate and gender to localStorage', () => {
    renderScreen();
    const birthDate = screen.getByLabelText('Fecha de nacimiento');
    fireEvent.change(birthDate, { target: { value: '15/05/1990' } });
    fireEvent.click(screen.getByText('Masculino'));
    fireEvent.click(screen.getByText('Guardar datos'));
    const saved = JSON.parse(localStorage.getItem('rayoexpress-personal-info') || '{}');
    expect(saved.birthDate).toBe('15/05/1990');
    expect(saved.gender).toBe('Masculino');
  });
});
