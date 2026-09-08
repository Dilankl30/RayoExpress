import { describe, it, expect } from 'vitest';
import { screenRoutes } from '../index';
import { screenPathMap } from '../screenPathMap';

describe('seguimiento public route', () => {
  it('maps seguimiento screen to /seguimiento', () => {
    expect(screenPathMap['seguimiento']).toBe('/seguimiento');
  });

  it('exposes /seguimiento and /seguimiento/:trackingCode without auth guard', () => {
    const paths = screenRoutes.map((r) => r.path);
    expect(paths).toContain('/seguimiento');
    expect(paths).toContain('/seguimiento/:trackingCode');
  });
});
