import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { mockNavigate, mockSetUser, mockUser, mockUpdateProfile } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetUser: vi.fn(),
  mockUser: { id: 'u1', full_name: 'Juan Perez', phone: null },
  mockUpdateProfile: vi.fn(),
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, user: mockUser, setUser: mockSetUser }),
}));

vi.mock('../../../../modules/client/application/client-service', () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

import { PersonalInfoScreen } from '../PersonalInfoScreen';

function renderScreen() {
  return render(<PersonalInfoScreen />);
}

afterEach(() => {
  cleanup();
});

describe('PersonalInfoScreen', () => {
  it('renders form fields with user name pre-filled', () => {
    renderScreen();
    expect(screen.getByDisplayValue('Juan')).toBeTruthy();
    expect(screen.getByDisplayValue('Perez')).toBeTruthy();
  });

  it('saves name and navigates back on save', async () => {
    mockUpdateProfile.mockResolvedValue({});
    renderScreen();
    const firstName = screen.getByLabelText('Nombre');
    fireEvent.change(firstName, { target: { value: 'Pedro' } });
    fireEvent.click(screen.getByText('Guardar datos'));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('u1', { full_name: 'Pedro Perez', phone: undefined });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('profile');
    });
  });

  it('disables save when first name is empty', () => {
    renderScreen();
    const firstName = screen.getByLabelText('Nombre');
    fireEvent.change(firstName, { target: { value: '' } });
    expect(screen.getByText('Guardar datos')).toBeDisabled();
  });
});
