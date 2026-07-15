import { describe, expect, it } from 'vitest';
import { parseCoverageAreaConfig } from '../coverage-area';

describe('parseCoverageAreaConfig', () => {
  it('returns null for invalid values', () => {
    expect(parseCoverageAreaConfig(null)).toBeNull();
    expect(parseCoverageAreaConfig({})).toBeNull();
    expect(parseCoverageAreaConfig({ center: [-2.1], radius_km: 5, city_name: 'El Coca' })).toBeNull();
  });

  it('returns a normalized config when the shape is valid', () => {
    expect(parseCoverageAreaConfig({
      center: [-2.1706, -79.9223],
      radius_km: 5,
      city_name: '  El Coca  ',
    })).toEqual({
      center: [-2.1706, -79.9223],
      radius_km: 5,
      city_name: 'El Coca',
    });
  });
});
