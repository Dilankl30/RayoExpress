import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockMockLogin = vi.fn();
let mockUser: { role: 'customer' } | null = null;

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  supabase: null,
}));

vi.mock('../../../../shared/lib/mockData', () => ({
  isMockMode: false,
}));

vi.mock('../../../../modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ navigate: mockNavigate, login: mockLogin, mockLogin: mockMockLogin, user: mockUser }),
}));

import { LoginScreen } from '../LoginScreen';

function renderScreen() {
  return render(<LoginScreen />);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    window.history.pushState({}, '', '/login');
  });

  it('renders options step by default', () => {
    renderScreen();
    expect(screen.getByText('Bienvenido')).toBeTruthy();
    expect(screen.getByText('Correo electrónico')).toBeTruthy();
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
    expect(screen.getByText('Recuperar cuenta')).toBeTruthy();
  });

  it('shows email step when clicking correo electronico', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Correo electrónico'));
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('shows register form when clicking crear cuenta', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Crear cuenta'));
    expect(screen.getByText('Enviar código')).toBeTruthy();
  });

  it('shows configuration error when Supabase is not ready for signup', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Crear cuenta'));
    const nameInput = screen.getByLabelText('Nombre completo');
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } });
    const emailInput = screen.getByLabelText('Correo electronico');
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    const passwordInput = screen.getByLabelText('Clave');
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    const confirmInput = screen.getByLabelText('Confirmar clave');
    fireEvent.change(confirmInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Enviar código'));
    expect(screen.getByText(/Supabase no est/)).toBeTruthy();
  });

  it('does not use demo login when mock mode is disabled', async () => {
    renderScreen();
    fireEvent.click(screen.getByText('Correo electrónico'));
    const emailInput = screen.getByLabelText('Correo electronico');
    fireEvent.change(emailInput, { target: { value: 'customer@rayo.com' } });
    const passwordInput = screen.getByLabelText('Clave');
    fireEvent.change(passwordInput, { target: { value: 'customer123' } });
    fireEvent.click(screen.getByText('Iniciar sesión'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Supabase no est/)).toBeTruthy();
    });
    expect(mockMockLogin).not.toHaveBeenCalled();
  });

  it('does not redirect while setting a recovered password', () => {
    mockUser = { role: 'customer' };
    window.history.pushState({}, '', `/login?recover=1&sent=${Date.now()}`);
    renderScreen();

    expect(screen.getByLabelText('Nueva clave')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('expires recovery links after three minutes', () => {
    mockUser = { role: 'customer' };
    window.history.pushState({}, '', `/login?recover=1&sent=${Date.now() - 181_000}`);
    renderScreen();

    expect(screen.getByText('Recuperar cuenta')).toBeTruthy();
    expect(screen.getByText(/enlace de recuperación expiró/i)).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
