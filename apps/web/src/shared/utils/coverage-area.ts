export interface CoverageZoneConfig {
  id: string;
  city_name: string;
  center: [number, number];
  radius_km: number;
  is_active: boolean;
  shape?: 'circle' | 'polygon';
  boundary?: [number, number][];
}

export interface CoverageZonesConfig {
  version: 2;
  active_city_id: string | null;
  cities: CoverageZoneConfig[];
}

export interface CoverageAreaConfig {
  center: [number, number];
  radius_km: number;
  city_name: string;
}

const DEFAULT_COVERAGE_ZONES: CoverageZonesConfig = {
  version: 2,
  active_city_id: 'coca',
  cities: [
    { id: 'coca', city_name: 'Puerto Francisco de Orellana (El Coca)', center: [-0.4632, -76.9892], radius_km: 5, is_active: true, shape: 'circle', boundary: [] },
    { id: 'quito', city_name: 'Quito', center: [-0.1807, -78.4678], radius_km: 8, is_active: false, shape: 'circle', boundary: [] },
    { id: 'guayaquil', city_name: 'Guayaquil', center: [-2.1709, -79.9224], radius_km: 10, is_active: false, shape: 'circle', boundary: [] },
  ],
};

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1]);
}

function normalizeCityKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isBoundaryPoints(value: unknown): value is [number, number][] {
  return Array.isArray(value) && value.every((point) => isNumberPair(point));
}

function normalizePolygonBoundary(value: unknown): [number, number][] {
  if (!isBoundaryPoints(value)) return [];
  return value.map((point) => [point[0], point[1]] as [number, number]);
}

function normalizeZone(candidate: Partial<CoverageZoneConfig> & { id?: unknown; city_name?: unknown; center?: unknown; radius_km?: unknown; is_active?: unknown; shape?: unknown; boundary?: unknown }): CoverageZoneConfig | null {
  if (typeof candidate.city_name !== 'string' || !candidate.city_name.trim()) return null;
  if (!isNumberPair(candidate.center)) return null;
  if (typeof candidate.radius_km !== 'number' || !Number.isFinite(candidate.radius_km) || candidate.radius_km <= 0) return null;

  const rawId = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : normalizeCityKey(candidate.city_name);
  const shape = candidate.shape === 'polygon' ? 'polygon' : 'circle';
  const boundary = normalizePolygonBoundary(candidate.boundary);
  return {
    id: rawId,
    city_name: candidate.city_name.trim(),
    center: [candidate.center[0], candidate.center[1]],
    radius_km: candidate.radius_km,
    is_active: candidate.is_active !== false,
    shape,
    boundary,
  };
}

export function getDefaultCoverageZones(): CoverageZonesConfig {
  return {
    version: DEFAULT_COVERAGE_ZONES.version,
    active_city_id: DEFAULT_COVERAGE_ZONES.active_city_id,
    cities: DEFAULT_COVERAGE_ZONES.cities.map((city) => ({ ...city, center: [city.center[0], city.center[1]] as [number, number], boundary: city.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [] })),
  };
}

export function parseCoverageZonesConfig(value: unknown): CoverageZonesConfig | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CoverageZonesConfig> & { cities?: unknown; active_city_id?: unknown; version?: unknown };
  if (!Array.isArray(candidate.cities)) return null;

  const cities = candidate.cities
    .map((city) => {
      if (!city || typeof city !== 'object') return null;
      return normalizeZone(city as Partial<CoverageZoneConfig> & { id?: unknown; city_name?: unknown; center?: unknown; radius_km?: unknown; is_active?: unknown });
    })
    .filter((city): city is CoverageZoneConfig => city !== null);

  if (cities.length === 0) return null;

  const activeCityId = typeof candidate.active_city_id === 'string' && candidate.active_city_id.trim()
    ? candidate.active_city_id.trim()
    : cities.find((city) => city.is_active)?.id ?? cities[0].id;

  return {
    version: 2,
    active_city_id: activeCityId,
    cities: cities.map((city) => ({
      ...city,
      is_active: city.id === activeCityId,
      boundary: city.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
    })),
  };
}

export function parseCoverageAreaConfig(value: unknown): CoverageAreaConfig | null {
  const zones = parseCoverageZonesConfig(value);
  if (zones) {
    const activeZone = getActiveCoverageZone(zones);
    return activeZone ? {
      center: [activeZone.center[0], activeZone.center[1]],
      radius_km: activeZone.radius_km,
      city_name: activeZone.city_name,
    } : null;
  }

  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<CoverageAreaConfig> & { center?: unknown; radius_km?: unknown; city_name?: unknown };
  if (!isNumberPair(candidate.center)) return null;
  if (typeof candidate.radius_km !== 'number' || !Number.isFinite(candidate.radius_km) || candidate.radius_km <= 0) return null;
  if (typeof candidate.city_name !== 'string' || !candidate.city_name.trim()) return null;

  return {
    center: [candidate.center[0], candidate.center[1]],
    radius_km: candidate.radius_km,
    city_name: candidate.city_name.trim(),
  };
}

export function getActiveCoverageZone(config: CoverageZonesConfig | null | undefined): CoverageZoneConfig | null {
  if (!config || !Array.isArray(config.cities) || config.cities.length === 0) return null;
  const active = config.cities.find((city) => city.id === config.active_city_id && city.is_active !== false)
    ?? config.cities.find((city) => city.is_active)
    ?? config.cities[0];
  return active ? {
    ...active,
    center: [active.center[0], active.center[1]] as [number, number],
    boundary: active.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
  } : null;
}

export function getCoverageZoneForCity(cityName: string | null | undefined, config: CoverageZonesConfig | null | undefined): CoverageZoneConfig | null {
  if (!config || !Array.isArray(config.cities) || config.cities.length === 0) return null;
  const normalizedCity = normalizeCityKey(cityName ?? '');
  if (!normalizedCity) return getActiveCoverageZone(config);

  const matched = config.cities.find((city) => normalizeCityKey(city.city_name) === normalizedCity || normalizeCityKey(city.id) === normalizedCity);
  return matched ? {
    ...matched,
    center: [matched.center[0], matched.center[1]] as [number, number],
    boundary: matched.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
  } : getActiveCoverageZone(config);
}

function getZoneReferencePoint(zone: CoverageZoneConfig): [number, number] {
  if (zone.shape !== 'polygon' || !Array.isArray(zone.boundary) || zone.boundary.length < 3) {
    return [zone.center[0], zone.center[1]];
  }

  const centroid = getPolygonCentroid(zone.boundary);
  return centroid ?? [zone.center[0], zone.center[1]];
}

export function isPointInCoverageZone(lat: number, lng: number, zone: CoverageZoneConfig): boolean {
  if (zone.shape === 'polygon' && Array.isArray(zone.boundary) && zone.boundary.length >= 3) {
    return isPointInPolygon(lat, lng, zone.boundary);
  }

  const R = 6371;
  const dLat = (zone.center[0] - lat) * Math.PI / 180;
  const dLng = (zone.center[1] - lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat * Math.PI / 180) * Math.cos(zone.center[0] * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  return distanceKm <= zone.radius_km;
}

export function isPointInAnyCoverageZone(lat: number, lng: number, config: CoverageZonesConfig | null | undefined): { inside: boolean; zone: CoverageZoneConfig | null; distanceKm: number | null } {
  if (!config || config.cities.length === 0) return { inside: true, zone: null, distanceKm: null };

  let bestZone: CoverageZoneConfig | null = null;
  let bestDistance: number | null = null;

  for (const zone of config.cities) {
    const [refLat, refLng] = getZoneReferencePoint(zone);
    const distanceKm = getDistanceKm(lat, lng, refLat, refLng);
    if (bestDistance === null || distanceKm < bestDistance) {
      bestZone = zone;
      bestDistance = distanceKm;
    }
    if (distanceKm <= zone.radius_km) {
      return { inside: true, zone, distanceKm };
    }
  }

  return { inside: false, zone: bestZone, distanceKm: bestDistance };
}

export function buildCoverageZonesConfig(zones: CoverageZoneConfig[], activeCityId?: string | null): CoverageZonesConfig {
  const normalizedCities = zones
    .map((zone) => normalizeZone(zone))
    .filter((zone): zone is CoverageZoneConfig => zone !== null);

  const active = activeCityId && normalizedCities.some((zone) => zone.id === activeCityId)
    ? activeCityId
    : normalizedCities.find((zone) => zone.is_active)?.id ?? normalizedCities[0]?.id ?? null;

  return {
    version: 2,
    active_city_id: active,
    cities: normalizedCities.map((zone) => ({
      ...zone,
      is_active: zone.id === active,
      boundary: zone.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
    })),
  };
}

export function coverageZonesToLegacyArea(config: CoverageZonesConfig | null | undefined): CoverageAreaConfig | null {
  const activeZone = getActiveCoverageZone(config);
  if (!activeZone) return parseCoverageAreaConfig(config ?? null);

  if (activeZone.shape === 'polygon' && Array.isArray(activeZone.boundary) && activeZone.boundary.length >= 3) {
    const centroid = getPolygonCentroid(activeZone.boundary) ?? [activeZone.center[0], activeZone.center[1]];
    const radius = Math.max(
      ...activeZone.boundary.map((point) => getDistanceKm(centroid[0], centroid[1], point[0], point[1])),
      activeZone.radius_km,
    );
    return {
      center: [centroid[0], centroid[1]],
      radius_km: radius,
      city_name: activeZone.city_name,
    };
  }

  return {
    center: [activeZone.center[0], activeZone.center[1]],
    radius_km: activeZone.radius_km,
    city_name: activeZone.city_name,
  };
}

function getPolygonCentroid(points: [number, number][]): [number, number] | null {
  if (points.length < 3) return null;
  let area = 0;
  let centroidLat = 0;
  let centroidLng = 0;

  for (let i = 0; i < points.length; i += 1) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    const cross = lat1 * lng2 - lat2 * lng1;
    area += cross;
    centroidLat += (lat1 + lat2) * cross;
    centroidLng += (lng1 + lng2) * cross;
  }

  if (Math.abs(area) < 1e-10) {
    const avg = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number], [0, 0]);
    return [avg[0] / points.length, avg[1] / points.length];
  }

  const factor = 1 / (3 * area);
  return [centroidLat * factor, centroidLng * factor];
}

function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersects = ((yi > lng) !== (yj > lng))
      && (lat < ((xj - xi) * (lng - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }

  return inside;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
