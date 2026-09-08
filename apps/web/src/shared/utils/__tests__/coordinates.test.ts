import { describe, expect, it } from 'vitest';
import { formatCoordinates, haversineKm, toCoordinatePair } from '../coordinates';

describe('toCoordinatePair', () => {
  it('returns a pair when both values are present', () => {
    expect(toCoordinatePair(-0.4632, -76.9892)).toEqual([-0.4632, -76.9892]);
  });

  it('returns null when one value is missing', () => {
    expect(toCoordinatePair(null, -76.9892)).toBeNull();
    expect(toCoordinatePair(-0.4632, undefined)).toBeNull();
  });
});

describe('formatCoordinates', () => {
  it('formats coordinates with default precision', () => {
    expect(formatCoordinates([-0.46321, -76.98921])).toBe('-0.4632, -76.9892');
  });

  it('returns an empty string when no coordinates exist', () => {
    expect(formatCoordinates(null)).toBe('');
  });
});

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm([-0.4632, -76.9892], [-0.4632, -76.9892])).toBeCloseTo(0, 6);
  });

  it('computes El Coca demo distance (~0.4 km)', () => {
    const d = haversineKm([-0.4632, -76.9892], [-0.466, -76.987]);
    expect(d).toBeGreaterThan(0.2);
    expect(d).toBeLessThan(1);
  });
});
