import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockMockLogin = vi.fn();

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  supabase: null,
}));

vi.mock('../../../../shared/lib/mockData', () => ({
  isMockMode: false,
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, login: mockLogin, mockLogin: mockMockLogin }),
}));

import { LoginScreen } from '../LoginScreen';

function renderScreen() {
  return render(<LoginScreen />);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders options step by default', () => {
    renderScreen();
    expect(screen.getByText('Bienvenido')).toBeTruthy();
    expect(screen.getByText('Correo electronico')).toBeTruthy();
    expect(screen.getByText('Crear cuenta nueva')).toBeTruthy();
  });

  it('shows email step when clicking correo electronico', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Correo electronico'));
    expect(screen.getByText('Iniciar sesion')).toBeTruthy();
  });

  it('shows register form when clicking crear cuenta', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Crear cuenta nueva'));
    expect(screen.getByText('Enviar codigo')).toBeTruthy();
  });

  it('shows configuration error when Supabase is not ready for signup', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Crear cuenta nueva'));
    const nameInput = screen.getByLabelText('Nombre completo');
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } });
    const emailInput = screen.getByLabelText('Correo electronico');
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    const passwordInput = screen.getByLabelText('Clave');
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    const confirmInput = screen.getByLabelText('Confirmar clave');
    fireEvent.change(confirmInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Enviar codigo'));
    expect(screen.getByText(/Supabase no esta configurado/)).toBeTruthy();
  });

  it('does not use demo login when mock mode is disabled', async () => {
    renderScreen();
    fireEvent.click(screen.getByText('Correo electronico'));
    const emailInput = screen.getByLabelText('Correo electronico');
    fireEvent.change(emailInput, { target: { value: 'customer@rayo.com' } });
    const passwordInput = screen.getByLabelText('Clave');
    fireEvent.change(passwordInput, { target: { value: 'customer123' } });
    fireEvent.click(screen.getByText('Iniciar sesion'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Supabase no esta configurado/)).toBeTruthy();
    });
    expect(mockMockLogin).not.toHaveBeenCalled();
  });
});
