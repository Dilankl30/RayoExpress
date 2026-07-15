import type { Role, Screen } from '../types';

export const PUBLIC_PATHS = ['/', '/login', '/register-store', '/register-driver'] as const;

export const CUSTOMER_HOME_PATHS = ['/home', '/explore', '/super', '/cart', '/tracking', '/orders', '/promotions', '/favorites', '/addresses', '/personal-info', '/notification-settings', '/wallet', '/profile'] as const;

export const ROLE_HOME_PATHS: Record<Role, string> = {
  customer: '/home',
  driver: '/driver',
  store: '/store-admin',
  admin: '/admin',
};

export const ROLE_HOME_SCREENS: Record<Role, Screen> = {
  customer: 'home',
  driver: 'driver',
  store: 'store-admin',
  admin: 'admin',
};

export const ROLE_DASHBOARD_PATHS: Record<Exclude<Role, 'customer'>, string> = {
  driver: '/driver',
  store: '/store-admin',
  admin: '/admin',
};

export const ROLE_ALLOWED_PATHS: Record<Role, readonly string[]> = {
  customer: CUSTOMER_HOME_PATHS,
  driver: ['/driver', '/profile'],
  store: ['/store-admin', '/profile'],
  admin: ['/admin', '/profile'],
};

export function getRoleHomePath(role: Role) {
  return ROLE_HOME_PATHS[role];
}

export function getRoleHomeScreen(role: Role) {
  return ROLE_HOME_SCREENS[role];
}

export function isDashboardPath(pathname: string) {
  return Object.values(ROLE_DASHBOARD_PATHS).some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => path === pathname);
}

export function isAllowedForRole(pathname: string, role: Role) {
  return ROLE_ALLOWED_PATHS[role].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getFallbackPathForRole(role: Role) {
  return getRoleHomePath(role);
}
