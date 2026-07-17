import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { resolveCurrentProfile } from '../application/auth-service';
import { mockCredentials, mockUser } from '../../../shared/lib/mockData';
import type { Screen, Role, UserProfile } from '../../../shared/types';
import { screenPathMap } from '../../../app/router/screenPathMap';
import { getFallbackPathForRole, getRoleHomeScreen, isPublicPath } from '../../../shared/security/access-policy';
import { isPasswordRecoveryUrl } from '../../../shared/auth/auth-redirect';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  screen: Screen;
  navigate: (s: Screen, params?: Record<string, string>) => void;
  login: (role: Role, accessToken?: string) => Promise<void>;
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

  const roleToScreen = useCallback((r: Role): Screen => getRoleHomeScreen(r), []);

  const mockLogin = useCallback(async (email: string, password: string): Promise<Role | null> => {
    const cred = mockCredentials[email.toLowerCase()];
    if (!cred || cred.password !== password) return null;
    const mu = mockUser(email.toLowerCase());
    if (mu) setUser(mu);
    navigate(roleToScreen(cred.role));
    return cred.role;
  }, [navigate, roleToScreen]);

  const login = useCallback(async (_role: Role, accessToken?: string) => {
    if (!isSupabaseReady || !supabase) return;

    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
        const profile = await resolveCurrentProfile({
          accessToken: accessToken ?? data.session?.access_token ?? null,
          userId: sessionUser?.id,
          email: sessionUser?.email ?? null,
          fullName: sessionUser?.user_metadata?.full_name ?? sessionUser?.email ?? null,
          phone: sessionUser?.phone ?? null,
          avatarUrl: sessionUser?.user_metadata?.avatar_url ?? null,
          role: sessionUser?.user_metadata?.role as Role | null,
    });

    if (!profile) throw new Error('No pudimos cargar tu perfil despues del inicio.');
    if (profile.is_suspended) throw new Error('Tu cuenta ha sido suspendida. Contacta a soporte.');
    setUser(profile);
    routerNavigate(getFallbackPathForRole(profile.role), { replace: true });
  }, [routerNavigate]);

  const logout = useCallback(async () => {
    if (isSupabaseReady && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    try { localStorage.removeItem('rayoexpress-cart'); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('cart:clear'));
    setScreen('landing');
    routerNavigate('/', { replace: true });
  }, [routerNavigate]);

  useEffect(() => {
    setScreen(screenFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const boot = async () => {
      if (!isSupabaseReady || !supabase) {
        setLoading(false);
        return;
      }

      if (isPasswordRecoveryUrl()) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const profile = await resolveCurrentProfile({
          accessToken: session.access_token ?? null,
          userId: session.user.id,
          email: session.user.email ?? null,
          fullName: session.user.user_metadata?.full_name ?? session.user.email ?? null,
          phone: session.user.phone ?? null,
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
          role: session.user.user_metadata?.role as Role | null,
        });
        if (profile) {
          setUser(profile);
        }
      } catch {
        console.warn('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    boot();

    if (!isSupabaseReady || !supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || isPasswordRecoveryUrl()) {
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setUser(null);
        return;
      }

      try {
        const profile = await resolveCurrentProfile({
          accessToken: session.access_token ?? null,
          userId: session.user.id,
          email: session.user.email ?? null,
          fullName: session.user.user_metadata?.full_name ?? session.user.email ?? null,
          phone: session.user.phone ?? null,
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
          role: session.user.user_metadata?.role as Role | null,
        });
        if (profile) {
          setUser(profile);
        }
      } catch {
        console.warn('Error loading profile after auth change');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isPasswordRecoveryUrl(location.pathname + location.search + location.hash)) return;
    if (user && isPublicPath(location.pathname)) {
      navigate(roleToScreen(user.role));
    }
  }, [user, loading, location.pathname, navigate, roleToScreen]);

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
