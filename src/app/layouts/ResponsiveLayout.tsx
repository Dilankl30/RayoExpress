import { useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNav } from './BottomNav';

const PUBLIC_PATHS = ['/', '/login'];
const DASHBOARD_PATHS = ['/driver', '/store-admin', '/admin'];

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);
  const isDashboard = DASHBOARD_PATHS.includes(path);
  const isCustomer = !!user && user.role === 'customer';

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <DesktopSidebar />

      <main className={`transition-all duration-300 pb-16 lg:pb-0 ${isDashboard ? 'lg:ml-64' : ''}`}>
        {children}
      </main>

      {isCustomer && <BottomNav />}
    </div>
  );
}
