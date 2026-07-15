import { useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNav } from './BottomNav';
import { CustomerDesktopHeader } from './CustomerDesktopHeader';
import { isDashboardPath, isPublicPath } from '../../shared/security/access-policy';

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isPublic = isPublicPath(path);
  const isDashboard = isDashboardPath(path);
  const isCustomer = !!user && user.role === 'customer';

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      {isCustomer ? <CustomerDesktopHeader /> : <DesktopSidebar />}

      <main className={`transition-all duration-300 pb-16 lg:pb-0 ${isDashboard ? 'lg:ml-64' : ''}`}>
        {children}
      </main>

      {isCustomer && <BottomNav />}
    </div>
  );
}
