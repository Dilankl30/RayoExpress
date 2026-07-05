import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { UserProfile, Role } from '../../../../shared/types';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => mockNavigate }));

vi.mock('../../../../integrations/supabase/client', () => ({
  isSupabaseReady: false,
  supabase: null,
  getSupabase: vi.fn(),
}));

vi.mock('../../application/auth-service', () => ({
  getProfile: vi.fn(),
  upsertProfile: vi.fn(),
}));

const mockCreds = vi.hoisted(() => ({
  'customer@rayo.com': { password: 'customer123', role: 'customer' as Role, name: 'Maria' },
  'driver@rayo.com': { password: 'driver123', role: 'driver' as Role, name: 'Carlos' },
  'store@rayo.com': { password: 'store123', role: 'store' as Role, name: 'BK' },
  'admin@rayo.com': { password: 'admin123', role: 'admin' as Role, name: 'Admin' },
}));

vi.mock('../../../../shared/lib/mockData', () => ({
  mockCredentials: mockCreds,
  mockUser: (email: string) => {
    const c = mockCreds[email as keyof typeof mockCreds];
    if (!c) return null;
    return { id: `mock-${c.role}`, email, full_name: c.name, role: c.role, phone: null, avatar_url: null, is_suspended: false };
  },
}));

vi.mock('../../../../app/router', () => ({
  screenPathMap: { landing: '/', login: '/login', home: '/home', driver: '/driver', 'store-admin': '/store-admin', admin: '/admin' },
}));

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => vi.clearAllMocks());

describe('initial state', () => {
  it('starts with null user and landing screen', () => {
    const { result } = renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.screen).toBe('landing');
  });
});

describe('mockLogin', () => {
  it('returns null for invalid credentials', async () => {
    const { result } = renderAuth();
    let role: Role | null = 'customer';
    await act(async () => { role = await result.current.mockLogin('x@y.com', 'wrong'); });
    expect(role).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('logs in customer and navigates to home', async () => {
    const { result } = renderAuth();
    await act(async () => { await result.current.mockLogin('customer@rayo.com', 'customer123'); });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.role).toBe('customer');
    expect(result.current.screen).toBe('home');
  });

  it('logs in driver and navigates to driver', async () => {
    const { result } = renderAuth();
    await act(async () => { await result.current.mockLogin('driver@rayo.com', 'driver123'); });
    expect(result.current.user!.role).toBe('driver');
    expect(result.current.screen).toBe('driver');
  });

  it('logs in store and navigates to store-admin', async () => {
    const { result } = renderAuth();
    await act(async () => { await result.current.mockLogin('store@rayo.com', 'store123'); });
    expect(result.current.user!.role).toBe('store');
    expect(result.current.screen).toBe('store-admin');
  });
});

describe('logout', () => {
  it('clears user and navigates to landing', async () => {
    const { result } = renderAuth();
    await act(async () => { await result.current.mockLogin('customer@rayo.com', 'customer123'); });
    expect(result.current.user).not.toBeNull();
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(result.current.screen).toBe('landing');
  });
});

describe('setUser', () => {
  it('updates user state', () => {
    const { result } = renderAuth();
    const profile: UserProfile = {
      id: 'u1', full_name: 'Test', phone: '+111', role: 'admin', avatar_url: null, is_suspended: false,
    };
    act(() => result.current.setUser(profile));
    expect(result.current.user).toEqual(profile);
  });

  it('clears user when set to null', () => {
    const { result } = renderAuth();
    act(() => result.current.setUser({
      id: 'u1', full_name: 'T', phone: null, role: 'customer', avatar_url: null, is_suspended: false,
    }));
    act(() => result.current.setUser(null));
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth without provider', () => {
  it('throws outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });
});
