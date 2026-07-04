import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ResponsiveLayout } from './components/shared/ResponsiveLayout';
import { LandingScreen } from './components/public/LandingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { HomeScreen } from './components/customer/HomeScreen';
import { StoreDetailScreen } from './components/customer/StoreDetailScreen';
import { CartScreen } from './components/customer/CartScreen';
import { TrackingScreen } from './components/customer/TrackingScreen';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { StoreDashboard } from './components/store/StoreDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

function AppContent() {
  const { screen, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'landing':
        return <LandingScreen />;
      case 'login':
        return <LoginScreen />;
      case 'home':
        return <HomeScreen />;
      case 'store-detail':
        return <StoreDetailScreen />;
      case 'cart':
        return <CartScreen />;
      case 'tracking':
        return <TrackingScreen />;
      case 'driver':
        return <DriverDashboard />;
      case 'store-admin':
        return <StoreDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <LandingScreen />;
    }
  };

  return <ResponsiveLayout>{renderScreen()}</ResponsiveLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
