import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { getProfile, upsertProfile } from '../../../services/auth';
import { mockCredentials, mockUser } from '../../../shared/lib/mockData';
import type { Screen, Role, UserProfile } from '../../../shared/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  screen: Screen;
  navigate: (s: Screen, params?: Record<string, string>) => void;
  navigationParams: Record<string, string>;
  login: (role: Role) => Promise<void>;
  mockLogin: (email: string, password: string) => Promise<Role | null>;
  logout: () => Promise<void>;
  setUser: (u: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('landing');

  const [navigationParams, setNavigationParams] = useState<Record<string, string>>({});
  const navigate = (s: Screen, params?: Record<string, string>) => {
    if (params) setNavigationParams(params);
    setScreen(s);
  };

  const roleToScreen = (r: Role): Screen =>
    ({ customer: 'home', driver: 'driver', store: 'store-admin', admin: 'admin' }[r] as Screen);

  const mockLogin = async (email: string, password: string): Promise<Role | null> => {
    const cred = mockCredentials[email.toLowerCase()];
    if (!cred || cred.password !== password) return null;
    const mu = mockUser(email.toLowerCase());
    if (mu) setUser(mu);
    setScreen(roleToScreen(cred.role) as Screen);
    return cred.role;
  };

  useEffect(() => {
    const boot = async () => {
      if (!isSupabaseReady) {
        setLoading(false);
        return;
      }
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        setLoading(false);
        return;
      }
      try {
        const profile = await getProfile(sessionUser.id);
        if (profile) {
          setUser(profile);
          if (!profile.is_suspended) {
            setScreen(roleToScreen(profile.role));
          }
        }
      } catch {
        console.warn('Error loading profile');
      }
      setLoading(false);
    };

    boot();

    if (!isSupabaseReady || !supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        setScreen('landing');
        return;
      }
      try {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUser(profile);
          if (!profile.is_suspended) {
            setScreen(roleToScreen(profile.role));
          }
        }
      } catch {
        console.warn('Error loading profile after auth change');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (role: Role) => {
    if (isSupabaseReady && supabase) {
      const userData = (await supabase.auth.getUser()).data.user;
      if (!userData) throw new Error('No user found');
      await upsertProfile(userData.id, role, {
        full_name: userData.user_metadata?.full_name ?? userData.email ?? null,
        phone: userData.phone ?? null,
      });
      const profile = await getProfile(userData.id);
      if (profile) {
        setUser(profile);
        setScreen(roleToScreen(role));
      }
    }
  };

  const logout = async () => {
    if (isSupabaseReady && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setScreen('landing');
  };

  return (
    <AuthContext.Provider value={{ user, loading, screen, navigate, navigationParams, login, mockLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
