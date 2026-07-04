import { AuthProvider } from '../../modules/auth/context/AuthContext';
import { CartProvider } from '../../modules/cart/context/CartContext';
import { NotificationProvider } from '../../modules/notifications/context/NotificationContext';
import { useAuth } from '../../modules/auth/context/AuthContext';
import type { ReactNode } from 'react';

function NotificationsLayer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <NotificationProvider userId={user?.id ?? null}>
      {children}
    </NotificationProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationsLayer>
          {children}
        </NotificationsLayer>
      </CartProvider>
    </AuthProvider>
  );
}
