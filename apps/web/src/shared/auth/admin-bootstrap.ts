import type { Role } from '../types';

function readConfiguredEmails() {
  const rawEmails = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  const singleEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

  return [singleEmail, rawEmails]
    .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

const configuredAdminEmails = new Set(readConfiguredEmails());

export function getBootstrapRoleForEmail(email?: string | null): Role | null {
  if (!email) return null;
  return configuredAdminEmails.has(email.trim().toLowerCase()) ? 'admin' : null;
}
