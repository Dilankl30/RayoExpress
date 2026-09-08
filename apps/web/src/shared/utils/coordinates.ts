export type CoordinatePair = [number, number];

export function toCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): CoordinatePair | null {
  return lat != null && lng != null ? [lat, lng] : null;
}

export function formatCoordinates(
  coordinates: CoordinatePair | null | undefined,
  digits = 4,
): string {
  if (!coordinates) return '';
  return `${coordinates[0].toFixed(digits)}, ${coordinates[1].toFixed(digits)}`;
}

/** Distancia haversiana en km entre dos pares [lat, lng]. */
export function haversineKm(a: CoordinatePair, b: CoordinatePair): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
