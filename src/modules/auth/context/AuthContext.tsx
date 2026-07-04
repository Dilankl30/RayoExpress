import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { getProfile, upsertProfile } from '../application/auth-service';
import { mockCredentials, mockUser } from '../../../shared/lib/mockData';
import type { Screen, Role, UserProfile } from '../../../shared/types';
import { screenPathMap } from '../../../app/router';

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
  const routerNavigate = useNavigate();

  const navigate = useCallback((s: Screen, params?: Record<string, string>) => {
    if (params) setNavigationParams(params);
    setScreen(s);
    const basePath = screenPathMap[s] || '/';
    const path = params && params.storeId ? `${basePath}/${params.storeId}` : basePath;
    routerNavigate(path, { replace: true });
  }, [routerNavigate]);

  const roleToScreen = useCallback((r: Role): Screen =>
    ({ customer: 'home', driver: 'driver', store: 'store-admin', admin: 'admin' }[r] as Screen), []);

  const mockLogin = useCallback(async (email: string, password: string): Promise<Role | null> => {
    const cred = mockCredentials[email.toLowerCase()];
    if (!cred || cred.password !== password) return null;
    const mu = mockUser(email.toLowerCase());
    if (mu) setUser(mu);
    const target = roleToScreen(cred.role);
    navigate(target);
    return cred.role;
  }, [navigate, roleToScreen]);

  const login = useCallback(async (_role: Role) => {
    if (isSupabaseReady && supabase) {
      const userData = (await supabase.auth.getUser()).data.user;
      if (!userData) throw new Error('No user found');
      await upsertProfile(userData.id, {
        full_name: userData.user_metadata?.full_name ?? userData.email ?? null,
        phone: userData.phone ?? null,
      });
      const profile = await getProfile(userData.id);
      if (profile) {
        if (profile.is_suspended) throw new Error('Tu cuenta ha sido suspendida. Contacta a soporte.');
        setUser(profile);
        navigate(roleToScreen(profile.role));
      }
    }
  }, [navigate, roleToScreen]);

  const logout = useCallback(async () => {
    if (isSupabaseReady && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    navigate('landing');
  }, [navigate]);

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
            navigate(roleToScreen(profile.role));
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
        navigate('landing');
        return;
      }
      try {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUser(profile);
          if (!profile.is_suspended) {
            navigate(roleToScreen(profile.role));
          }
        }
      } catch {
        console.warn('Error loading profile after auth change');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate, roleToScreen]);

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
