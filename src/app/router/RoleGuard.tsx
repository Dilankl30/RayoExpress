import { Navigate } from 'react-router';
import { useAuth } from '../../modules/auth/context/AuthContext';
import type { ReactNode } from 'react';
import type { Role } from '../../shared/types';

export function RoleGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    const fallback: Record<string, string> = {
      customer: '/home',
      driver: '/driver',
      store: '/store-admin',
      admin: '/admin',
    };
    return <Navigate to={user ? fallback[user.role] || '/' : '/login'} replace />;
  }

  return <>{children}</>;
}
