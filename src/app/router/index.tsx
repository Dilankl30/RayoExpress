import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';
import type { Role } from '../../shared/types';

const LandingScreen = lazy(() => import('../components/public/LandingScreen').then(m => ({ default: m.LandingScreen })));
const LoginScreen = lazy(() => import('../components/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const HomeScreen = lazy(() => import('../components/customer/HomeScreen').then(m => ({ default: m.HomeScreen })));
const StoreDetailScreen = lazy(() => import('../components/customer/StoreDetailScreen').then(m => ({ default: m.StoreDetailScreen })));
const CartScreen = lazy(() => import('../components/customer/CartScreen').then(m => ({ default: m.CartScreen })));
const TrackingScreen = lazy(() => import('../components/customer/TrackingScreen').then(m => ({ default: m.TrackingScreen })));
const OrdersScreen = lazy(() => import('../components/customer/OrdersScreen').then(m => ({ default: m.OrdersScreen })));
const PromotionsScreen = lazy(() => import('../components/customer/PromotionsScreen').then(m => ({ default: m.PromotionsScreen })));
const FavoritesScreen = lazy(() => import('../components/customer/FavoritesScreen').then(m => ({ default: m.FavoritesScreen })));
const AddressesScreen = lazy(() => import('../components/customer/AddressesScreen').then(m => ({ default: m.AddressesScreen })));
const PersonalInfoScreen = lazy(() => import('../components/customer/PersonalInfoScreen').then(m => ({ default: m.PersonalInfoScreen })));
const NotificationSettingsScreen = lazy(() => import('../components/customer/NotificationSettingsScreen').then(m => ({ default: m.NotificationSettingsScreen })));
const WalletScreen = lazy(() => import('../components/customer/WalletScreen').then(m => ({ default: m.WalletScreen })));
const DriverDashboard = lazy(() => import('../components/driver/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const StoreDashboard = lazy(() => import('../components/store/StoreDashboard').then(m => ({ default: m.StoreDashboard })));
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ProfileScreen = lazy(() => import('../components/shared/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const StoreApplicationScreen = lazy(() => import('../components/auth/StoreApplicationScreen').then(m => ({ default: m.StoreApplicationScreen })));
const DriverApplicationScreen = lazy(() => import('../components/auth/DriverApplicationScreen').then(m => ({ default: m.DriverApplicationScreen })));

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

export function ProtectedRoute({ element, allowedRoles }: { element: React.ReactElement; allowedRoles?: Role[] }) {
  return (
    <AuthGuard>
      {allowedRoles ? (
        <RoleGuard allowedRoles={allowedRoles}>
          {element}
        </RoleGuard>
      ) : (
        element
      )}
    </AuthGuard>
  );
}

const roleRoutes: Record<Role, string[]> = {
  customer: ['home', 'store-detail', 'cart', 'tracking', 'orders', 'promotions', 'favorites', 'addresses', 'personal-info', 'notification-settings', 'wallet', 'profile'],
  driver: ['driver', 'profile'],
  store: ['store-admin', 'profile'],
  admin: ['admin', 'profile'],
};

export const screenRoutes: RouteObject[] = [
  { path: '/', element: <Lazy><LandingScreen /></Lazy> },
  { path: '/login', element: <Lazy><LoginScreen /></Lazy> },
  { path: '/register-store', element: <Lazy><StoreApplicationScreen /></Lazy> },
  { path: '/register-driver', element: <Lazy><DriverApplicationScreen /></Lazy> },
  {
    path: '/home',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<HomeScreen />} /></Lazy>,
  },
  {
    path: '/store-detail/:storeId',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<StoreDetailScreen />} /></Lazy>,
  },
  {
    path: '/cart',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<CartScreen />} /></Lazy>,
  },
  {
    path: '/tracking',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<TrackingScreen />} /></Lazy>,
  },
  {
    path: '/orders',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<OrdersScreen />} /></Lazy>,
  },
  {
    path: '/promotions',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<PromotionsScreen />} /></Lazy>,
  },
  {
    path: '/favorites',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<FavoritesScreen />} /></Lazy>,
  },
  {
    path: '/addresses',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<AddressesScreen />} /></Lazy>,
  },
  {
    path: '/personal-info',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<PersonalInfoScreen />} /></Lazy>,
  },
  {
    path: '/notification-settings',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<NotificationSettingsScreen />} /></Lazy>,
  },
  {
    path: '/wallet',
    element: <Lazy><ProtectedRoute allowedRoles={['customer']} element={<WalletScreen />} /></Lazy>,
  },
  {
    path: '/driver',
    element: <Lazy><ProtectedRoute allowedRoles={['driver']} element={<DriverDashboard />} /></Lazy>,
  },
  {
    path: '/store-admin',
    element: <Lazy><ProtectedRoute allowedRoles={['store']} element={<StoreDashboard />} /></Lazy>,
  },
  {
    path: '/admin',
    element: <Lazy><ProtectedRoute allowedRoles={['admin']} element={<AdminDashboard />} /></Lazy>,
  },
  {
    path: '/profile',
    element: <Lazy><ProtectedRoute element={<ProfileScreen />} /></Lazy>,
  },
];

export const screenPathMap: Record<string, string> = {
  landing: '/',
  login: '/login',
  'register-store': '/register-store',
  'register-driver': '/register-driver',
  home: '/home',
  'store-detail': '/store-detail',
  cart: '/cart',
  tracking: '/tracking',
  orders: '/orders',
  promotions: '/promotions',
  favorites: '/favorites',
  addresses: '/addresses',
  'personal-info': '/personal-info',
  'notification-settings': '/notification-settings',
  wallet: '/wallet',
  driver: '/driver',
  'store-admin': '/store-admin',
  admin: '/admin',
  profile: '/profile',
};

export { roleRoutes };
