// Reverse geocode lat/lng → city name using Nominatim (free, no API key)
export async function detectCity(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { 'User-Agent': 'RayoExpress/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Try city, town, village, hamlet, or county in that order
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.hamlet || addr.county || addr.state || null;
  } catch {
    return null;
  }
}

// Simple cache to avoid hitting Nominatim too often
const cityCache = new Map<string, string>();

export function getCityCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function detectCityCached(lat: number, lng: number): Promise<string | null> {
  const key = getCityCacheKey(lat, lng);
  if (cityCache.has(key)) return cityCache.get(key)!;
  const city = await detectCity(lat, lng);
  if (city) cityCache.set(key, city);
  return city;
}
