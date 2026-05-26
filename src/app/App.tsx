import { useEffect, useState } from 'react';
import type { Screen, Role, CartItem } from './types';
import { LoginScreen } from './components/auth/LoginScreen';
import { HomeScreen } from './components/customer/HomeScreen';
import { StoreDetailScreen } from './components/customer/StoreDetailScreen';
import { CartScreen } from './components/customer/CartScreen';
import { TrackingScreen } from './components/customer/TrackingScreen';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { StoreDashboard } from './components/store/StoreDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { supabase } from './lib/supabase';
import { getProfile, upsertProfile } from './lib/auth';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [role, setRole] = useState<Role>('customer');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('1');
  const [activeOrderId, setActiveOrderId] = useState<string>('ORD-001');

  const navigate = (s: Screen) => setScreen(s);

  const roleToScreen = (r: Role): Screen => ({ customer: 'home', driver: 'driver', store: 'store-admin', admin: 'admin' }[r]);

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      const profile = await getProfile(user.id);
      const resolvedRole = profile?.role ?? 'customer';
      setRole(resolvedRole);
      setScreen(roleToScreen(resolvedRole));
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setScreen('login');
        return;
      }
      const profile = await getProfile(session.user.id);
      const resolvedRole = profile?.role ?? 'customer';
      setRole(resolvedRole);
      setScreen(roleToScreen(resolvedRole));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (r: Role) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await upsertProfile(user.id, r, { full_name: user.user_metadata?.full_name ?? user.email ?? null, phone: user.phone ?? null });
    setRole(r);
    setScreen(roleToScreen(r));
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  const handleSelectStore = (id: string) => {
    setSelectedStoreId(id);
    setScreen('store-detail');
  };

  const handlePlaceOrder = () => {
    setActiveOrderId(`ORD-${Math.floor(Math.random() * 9000) + 1000}`);
    setCart([]);
    setScreen('tracking');
  };

  switch (screen) {
    case 'login': return <LoginScreen onLogin={handleLogin} />;
    case 'home': return <HomeScreen onNavigate={navigate} cartCount={cartCount} onSelectStore={handleSelectStore} />;
    case 'store-detail': return <StoreDetailScreen storeId={selectedStoreId} onNavigate={navigate} onAddToCart={addToCart} cartCount={cartCount} />;
    case 'cart': return <CartScreen cart={cart} setCart={setCart} onNavigate={navigate} onPlaceOrder={handlePlaceOrder} />;
    case 'tracking': return <TrackingScreen orderId={activeOrderId} onNavigate={navigate} />;
    case 'driver': return <DriverDashboard onNavigate={navigate} />;
    case 'store-admin': return <StoreDashboard onNavigate={navigate} />;
    case 'admin': return <AdminDashboard onNavigate={navigate} />;
    default: return <LoginScreen onLogin={handleLogin} />;
  }
}
