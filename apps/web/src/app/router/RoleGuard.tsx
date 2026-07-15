import { Navigate } from 'react-router';
import { useAuth } from '../../modules/auth/context/AuthContext';
import type { ReactNode } from 'react';
import type { Role } from '../../shared/types';
import { getFallbackPathForRole } from '../../shared/security/access-policy';

export function RoleGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={user ? getFallbackPathForRole(user.role) : '/login'} replace />;
  }

  return <>{children}</>;
}
