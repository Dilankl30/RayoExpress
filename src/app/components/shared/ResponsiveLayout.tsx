import type { ReactNode } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';

const PUBLIC_SCREENS = ['landing', 'login'];

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const { screen } = useAuth();
  const isPublic = PUBLIC_SCREENS.includes(screen);
  const isDashboard = ['driver', 'store-admin', 'admin'].includes(screen);

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (isDashboard) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <DesktopSidebar />
        <main className="flex-1 lg:ml-0">
          <div className="w-full">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <DesktopSidebar />
      <main className="flex-1 lg:ml-0">
        <div className="w-full max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
