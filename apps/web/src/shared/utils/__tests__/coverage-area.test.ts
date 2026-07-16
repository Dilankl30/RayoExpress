import { describe, expect, it } from 'vitest';
import {
  buildCoverageZonesConfig,
  coverageZonesToLegacyArea,
  getActiveCoverageZone,
  getCoverageZoneForCity,
  isPointInAnyCoverageZone,
  parseCoverageAreaConfig,
  parseCoverageZonesConfig,
} from '../coverage-area';

describe('coverage-area', () => {
  it('returns null for invalid values', () => {
    expect(parseCoverageAreaConfig(null)).toBeNull();
    expect(parseCoverageAreaConfig({})).toBeNull();
    expect(parseCoverageZonesConfig({})).toBeNull();
  });

  it('parses legacy and multi-city coverage configs', () => {
    expect(parseCoverageAreaConfig({
      center: [-2.1706, -79.9223],
      radius_km: 5,
      city_name: '  El Coca  ',
    })).toEqual({
      center: [-2.1706, -79.9223],
      radius_km: 5,
      city_name: 'El Coca',
    });

    const zones = parseCoverageZonesConfig({
      version: 2,
      active_city_id: 'quito',
      cities: [
        { id: 'coca', city_name: 'El Coca', center: [-0.46, -76.98], radius_km: 5, is_active: false },
        { id: 'quito', city_name: 'Quito', center: [-0.18, -78.47], radius_km: 8, is_active: true },
      ],
    });

    expect(zones?.version).toBe(2);
    expect(getActiveCoverageZone(zones)?.city_name).toBe('Quito');
    expect(getCoverageZoneForCity('Quito', zones)?.id).toBe('quito');
    expect(coverageZonesToLegacyArea(zones)).toEqual({
      center: [-0.18, -78.47],
      radius_km: 8,
      city_name: 'Quito',
    });
  });

  it('chooses the closest matching zone and validates points', () => {
    const zones = buildCoverageZonesConfig([
      { id: 'coca', city_name: 'El Coca', center: [-0.4632, -76.9892], radius_km: 5, is_active: true },
      { id: 'quito', city_name: 'Quito', center: [-0.1807, -78.4678], radius_km: 8, is_active: false },
    ]);

    const result = isPointInAnyCoverageZone(-0.4631, -76.9891, zones);
    expect(result.inside).toBe(true);
    expect(result.zone?.id).toBe('coca');

    const outside = isPointInAnyCoverageZone(-3.0, -79.5, zones);
    expect(outside.inside).toBe(false);
    expect(outside.zone?.id).toBe('quito');
  });
});
