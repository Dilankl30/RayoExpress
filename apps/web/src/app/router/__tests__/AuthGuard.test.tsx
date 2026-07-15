import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../../../modules/auth/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

import { AuthGuard } from '../AuthGuard';

describe('AuthGuard', () => {
  it('should render Navigate to /login when user is null and loading is false', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthGuard><div>Protected</div></AuthGuard>
      </MemoryRouter>,
    );
    // Navigate component replaces the children with a redirect, so protected content should not be visible
    expect(container.textContent).not.toContain('Protected');
  });

  it('should show spinner when loading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <AuthGuard><div>Protected</div></AuthGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Cargando...')).toBeTruthy();
  });

  it('should render children when user exists', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'customer' }, loading: false });
    render(
      <MemoryRouter>
        <AuthGuard><div>Protected Content</div></AuthGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });
});
