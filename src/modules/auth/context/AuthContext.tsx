import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
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
  login: (role: Role) => Promise<void>;
  mockLogin: (email: string, password: string) => Promise<Role | null>;
  logout: () => Promise<void>;
  setUser: (u: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function screenFromPath(pathname: string): Screen {
  const match = Object.entries(screenPathMap)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, path]) => path === pathname || (path !== '/' && pathname.startsWith(`${path}/`)));
  return (match?.[0] as Screen | undefined) ?? 'landing';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>(() => screenFromPath(typeof window === 'undefined' ? '/' : window.location.pathname));
  const routerNavigate = useNavigate();
  const location = useLocation();

  const navigate = useCallback((s: Screen, params?: Record<string, string>) => {
    setScreen(s);
    const basePath = screenPathMap[s] || '/';
    const path = params && params.storeId ? `${basePath}/${params.storeId}` : basePath;
    routerNavigate(path);
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
      if (!profile) throw new Error('No pudimos cargar tu perfil después del inicio.');
      if (profile.is_suspended) throw new Error('Tu cuenta ha sido suspendida. Contacta a soporte.');
      setUser(profile);
      routerNavigate(screenPathMap[roleToScreen(profile.role)] || '/home', { replace: true });
    }
  }, [roleToScreen, routerNavigate]);

  const logout = useCallback(async () => {
    if (isSupabaseReady && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setScreen('landing');
    routerNavigate('/', { replace: true });
  }, [routerNavigate]);

  useEffect(() => {
    setScreen(screenFromPath(location.pathname));
  }, [location.pathname]);

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
        let profile = await getProfile(sessionUser.id);
        if (!profile) {
          await upsertProfile(sessionUser.id, {
            full_name: sessionUser.user_metadata?.full_name ?? sessionUser.email ?? null,
          });
          profile = await getProfile(sessionUser.id);
        }
        if (profile) {
          setUser(profile);
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
        return;
      }
      try {
        let profile = await getProfile(session.user.id);
        if (!profile) {
          await upsertProfile(session.user.id, {
            full_name: session.user.user_metadata?.full_name ?? session.user.email ?? null,
          });
          profile = await getProfile(session.user.id);
        }
        if (profile) {
          setUser(profile);
        }
      } catch {
        console.warn('Error loading profile after auth change');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, screen, navigate, login, mockLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
