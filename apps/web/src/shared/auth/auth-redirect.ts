export function getAuthRedirectUrl(pathname = '/login') {
  if (typeof window === 'undefined') return pathname;

  const url = new URL(window.location.href);

  url.pathname = pathname;
  url.search = '';
  url.hash = '';

  return url.toString();
}
