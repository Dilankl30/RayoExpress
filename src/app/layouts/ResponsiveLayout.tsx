import { useState } from 'react';
import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNav } from './BottomNav';

const PUBLIC_SCREENS = ['landing', 'login'];
const DASHBOARD_SCREENS = ['driver', 'store-admin', 'admin'];

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const { screen } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isPublic = PUBLIC_SCREENS.includes(screen);
  const isDashboard = DASHBOARD_SCREENS.includes(screen);

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  const contentMargin = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopSidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-12 left-3 z-20 lg:hidden w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: '#6D28D9' }}
      >
        <Menu size={20} className="text-white" />
      </button>

      <main className={`${contentMargin} transition-all duration-300 pb-16 lg:pb-0`}>
        <div className={isDashboard ? 'w-full' : 'w-full max-w-7xl mx-auto'}>
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
