export interface CoverageAreaConfig {
  center: [number, number];
  radius_km: number;
  city_name: string;
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1]);
}

export function parseCoverageAreaConfig(value: unknown): CoverageAreaConfig | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<CoverageAreaConfig> & { center?: unknown; radius_km?: unknown; city_name?: unknown };
  if (!isNumberPair(candidate.center)) return null;
  if (typeof candidate.radius_km !== 'number' || !Number.isFinite(candidate.radius_km)) return null;
  if (typeof candidate.city_name !== 'string' || !candidate.city_name.trim()) return null;

  return {
    center: [candidate.center[0], candidate.center[1]],
    radius_km: candidate.radius_km,
    city_name: candidate.city_name.trim(),
  };
}
