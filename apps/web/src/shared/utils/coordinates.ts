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
