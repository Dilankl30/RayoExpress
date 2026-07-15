import { describe, expect, it } from 'vitest';
import { formatCoordinates, toCoordinatePair } from '../coordinates';

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
