import type { ReactNode } from 'react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNav } from './BottomNav';

const PUBLIC_SCREENS = ['landing', 'login'];
const DASHBOARD_SCREENS = ['driver', 'store-admin', 'admin'];

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const { screen } = useAuth();
  const isPublic = PUBLIC_SCREENS.includes(screen);
  const isDashboard = DASHBOARD_SCREENS.includes(screen);
  const isCustomer = !isPublic && !isDashboard;

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <DesktopSidebar />

      <main className={`transition-all duration-300 pb-16 lg:pb-0 ${isDashboard ? 'lg:ml-64' : ''}`}>
        <div className={isDashboard ? 'w-full' : 'w-full'}>
          {children}
        </div>
      </main>

      {isCustomer && <BottomNav />}
    </div>
  );
}
