export function getAuthRedirectUrl(pathname = '/login') {
  if (typeof window === 'undefined') return pathname;

  const currentUrl = new URL(window.location.href);
  const targetUrl = new URL(pathname, currentUrl.origin);

  currentUrl.pathname = targetUrl.pathname;
  currentUrl.search = targetUrl.search;
  currentUrl.hash = targetUrl.hash;

  return currentUrl.toString();
}

export function isPasswordRecoveryUrl(url = typeof window === 'undefined' ? '' : window.location.href) {
  if (!url) return false;

  const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const currentUrl = new URL(url, baseUrl);
  const queryParams = new URLSearchParams(currentUrl.search);
  const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));

  return queryParams.get('recover') === '1' || hashParams.get('type') === 'recovery';
}
