import { describe, expect, it } from 'vitest';
import { buildRelationshipLinkRoute } from '@/renderer/linkRouting';

describe('buildRelationshipLinkRoute', () => {
  it('is deterministic for identical inputs', () => {
    const input = {
      source: { x: 0, y: 0, z: 0 },
      target: { x: 4, y: 1, z: 0.2 },
      linkIndex: 1,
      parallelCount: 3,
    };

    const routeA = buildRelationshipLinkRoute(input);
    const routeB = buildRelationshipLinkRoute(input);

    expect(routeA).toHaveLength(4);
    expect(routeB).toHaveLength(4);

    for (let i = 0; i < 4; i++) {
      expect(routeA[i].x).toBeCloseTo(routeB[i].x, 8);
      expect(routeA[i].y).toBeCloseTo(routeB[i].y, 8);
      expect(routeA[i].z).toBeCloseTo(routeB[i].z, 8);
    }
  });

  it('returns start/control/control/end points with depth lift on controls', () => {
    const route = buildRelationshipLinkRoute({
      source: { x: -1, y: -1, z: 0.1 },
      target: { x: 2, y: 1, z: 0.1 },
      linkIndex: 0,
      parallelCount: 2,
    });

    expect(route).toHaveLength(4);

    const [start, controlA, controlB, end] = route;
    expect(controlA.z).toBeGreaterThan(start.z);
    expect(controlB.z).toBeGreaterThan(end.z);
  });

  it('applies deterministic endpoint fan-out for parallel links', () => {
    const left = buildRelationshipLinkRoute({
      source: { x: 0, y: 0, z: 0 },
      target: { x: 3, y: 0, z: 0 },
      linkIndex: 0,
      parallelCount: 3,
    });

    const middle = buildRelationshipLinkRoute({
      source: { x: 0, y: 0, z: 0 },
      target: { x: 3, y: 0, z: 0 },
      linkIndex: 1,
      parallelCount: 3,
    });

    const right = buildRelationshipLinkRoute({
      source: { x: 0, y: 0, z: 0 },
      target: { x: 3, y: 0, z: 0 },
      linkIndex: 2,
      parallelCount: 3,
    });

    expect(left[0].distanceTo(middle[0])).toBeGreaterThan(0);
    expect(right[0].distanceTo(middle[0])).toBeGreaterThan(0);
    expect(left[0].distanceTo(right[0])).toBeGreaterThan(0);
  });
});
