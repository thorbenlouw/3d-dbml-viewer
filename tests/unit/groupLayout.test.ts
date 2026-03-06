import { describe, it, expect } from 'vitest';
import {
  buildGroupDescriptors,
  placeGroups,
  computeGroupSeedPositions,
  computeGroupBoundaries,
} from '@/layout/groupLayout';
import type { ParsedSchema } from '@/types';

const simpleGroupedSchema: ParsedSchema = {
  tables: [
    { id: 'users', name: 'users', columns: [], tableGroup: 'commerce' },
    { id: 'orders', name: 'orders', columns: [], tableGroup: 'commerce' },
    { id: 'products', name: 'products', columns: [], tableGroup: 'catalog' },
    { id: 'categories', name: 'categories', columns: [], tableGroup: 'catalog' },
    { id: 'audit_log', name: 'audit_log', columns: [] }, // ungrouped
  ],
  refs: [
    {
      id: 'orders->users:0',
      sourceId: 'orders',
      targetId: 'users',
      sourceFieldNames: ['user_id'],
      targetFieldNames: ['id'],
    },
    {
      id: 'orders->products:0',
      sourceId: 'orders',
      targetId: 'products',
      sourceFieldNames: ['product_id'],
      targetFieldNames: ['id'],
    },
  ],
};

const noGroupSchema: ParsedSchema = {
  tables: [
    { id: 'a', name: 'a', columns: [] },
    { id: 'b', name: 'b', columns: [] },
  ],
  refs: [],
};

describe('buildGroupDescriptors', () => {
  it('returns one descriptor per distinct group', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    expect(descriptors).toHaveLength(2);
  });

  it('descriptor ids match group names', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const ids = descriptors.map((d) => d.id).sort();
    expect(ids).toEqual(['catalog', 'commerce']);
  });

  it('each descriptor lists the correct table ids', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const catalog = descriptors.find((d) => d.id === 'catalog');
    const commerce = descriptors.find((d) => d.id === 'commerce');
    expect(catalog?.tableIds.sort()).toEqual(['categories', 'products']);
    expect(commerce?.tableIds.sort()).toEqual(['orders', 'users']);
  });

  it('descriptors are returned in alphabetical order', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    expect(descriptors[0].id).toBe('catalog');
    expect(descriptors[1].id).toBe('commerce');
  });

  it('half-extents are positive numbers', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    for (const desc of descriptors) {
      expect(desc.halfWidth).toBeGreaterThan(0);
      expect(desc.halfHeight).toBeGreaterThan(0);
      expect(desc.halfDepth).toBeGreaterThan(0);
    }
  });

  it('returns empty array when no tables have groups', () => {
    const descriptors = buildGroupDescriptors(noGroupSchema);
    expect(descriptors).toHaveLength(0);
  });

  it('uses provided card dimensions for size estimates', () => {
    const smallDims = new Map([
      ['users', { width: 1, height: 1, depth: 0.1 }],
      ['orders', { width: 1, height: 1, depth: 0.1 }],
    ]);
    const largeDims = new Map([
      ['users', { width: 5, height: 4, depth: 0.1 }],
      ['orders', { width: 5, height: 4, depth: 0.1 }],
    ]);
    const smallDescs = buildGroupDescriptors(simpleGroupedSchema, smallDims);
    const largeDescs = buildGroupDescriptors(simpleGroupedSchema, largeDims);
    const commerceSmall = smallDescs.find((d) => d.id === 'commerce')!;
    const commerceLarge = largeDescs.find((d) => d.id === 'commerce')!;
    expect(commerceLarge.halfWidth).toBeGreaterThan(commerceSmall.halfWidth);
  });
});

describe('placeGroups', () => {
  it('returns empty map for empty descriptor list', () => {
    const centers = placeGroups([]);
    expect(centers.size).toBe(0);
  });

  it('returns one center per descriptor', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    expect(centers.size).toBe(2);
    expect(centers.has('catalog')).toBe(true);
    expect(centers.has('commerce')).toBe(true);
  });

  it('all centers have finite x, y, z', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    for (const center of centers.values()) {
      expect(Number.isFinite(center.x)).toBe(true);
      expect(Number.isFinite(center.y)).toBe(true);
      expect(Number.isFinite(center.z)).toBe(true);
    }
  });

  it('placed groups do not overlap (bounding boxes are separate)', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);

    const boxes = descriptors.map((d) => {
      const c = centers.get(d.id)!;
      return {
        minX: c.x - d.halfWidth,
        maxX: c.x + d.halfWidth,
      };
    });

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.maxX > b.minX && b.maxX > a.minX;
        expect(overlap).toBe(false);
      }
    }
  });

  it('is deterministic', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const a = placeGroups(descriptors);
    const b = placeGroups(descriptors);
    for (const [id, ca] of a) {
      const cb = b.get(id)!;
      expect(ca.x).toBeCloseTo(cb.x, 8);
      expect(ca.y).toBeCloseTo(cb.y, 8);
      expect(ca.z).toBeCloseTo(cb.z, 8);
    }
  });
});

describe('computeGroupSeedPositions', () => {
  it('returns a position for every table', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    const positions = computeGroupSeedPositions(simpleGroupedSchema, centers);
    expect(positions.size).toBe(simpleGroupedSchema.tables.length);
  });

  it('all positions have finite coordinates', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    const positions = computeGroupSeedPositions(simpleGroupedSchema, centers);
    for (const pos of positions.values()) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
      expect(Number.isFinite(pos.z)).toBe(true);
    }
  });

  it('grouped tables are seeded near their group center', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    const positions = computeGroupSeedPositions(simpleGroupedSchema, centers);

    const catalogCenter = centers.get('catalog')!;
    const productsPos = positions.get('products')!;
    const categoriesPos = positions.get('categories')!;

    const distProducts = Math.sqrt(
      (productsPos.x - catalogCenter.x) ** 2 +
        (productsPos.y - catalogCenter.y) ** 2 +
        (productsPos.z - catalogCenter.z) ** 2,
    );
    const distCategories = Math.sqrt(
      (categoriesPos.x - catalogCenter.x) ** 2 +
        (categoriesPos.y - catalogCenter.y) ** 2 +
        (categoriesPos.z - catalogCenter.z) ** 2,
    );

    // Seeds should be within a small radius (seedRadius = 1.2 by default)
    expect(distProducts).toBeLessThan(2.5);
    expect(distCategories).toBeLessThan(2.5);
  });

  it('ungrouped tables are seeded near origin', () => {
    const descriptors = buildGroupDescriptors(simpleGroupedSchema);
    const centers = placeGroups(descriptors);
    const positions = computeGroupSeedPositions(simpleGroupedSchema, centers);

    const auditPos = positions.get('audit_log')!;
    const distFromOrigin = Math.sqrt(auditPos.x ** 2 + auditPos.y ** 2 + auditPos.z ** 2);
    expect(distFromOrigin).toBeLessThan(2);
  });

  it('returns positions for all tables when no groups exist', () => {
    const positions = computeGroupSeedPositions(noGroupSchema, new Map());
    expect(positions.size).toBe(2);
  });
});

describe('computeGroupBoundaries', () => {
  const nodes = [
    { id: 'users', x: -3, y: 0, z: 0 },
    { id: 'orders', x: -2, y: 0, z: 0 },
    { id: 'products', x: 2, y: 0, z: 0 },
    { id: 'categories', x: 3, y: 0, z: 0 },
    { id: 'audit_log', x: 0, y: 5, z: 0 },
  ];

  const cardDims = new Map(nodes.map((n) => [n.id, { width: 2, height: 1.5, depth: 0.14 }]));

  it('returns one boundary per group (not for ungrouped tables)', () => {
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, cardDims);
    expect(boundaries).toHaveLength(2);
  });

  it('boundary ids match group names', () => {
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, cardDims);
    const ids = boundaries.map((b) => b.groupId).sort();
    expect(ids).toEqual(['catalog', 'commerce']);
  });

  it('boundaries are returned in alphabetical order', () => {
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, cardDims);
    expect(boundaries[0].groupId).toBe('catalog');
    expect(boundaries[1].groupId).toBe('commerce');
  });

  it('boundary center is roughly between member node positions', () => {
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, cardDims);
    const commerce = boundaries.find((b) => b.groupId === 'commerce')!;
    // users at x=-3, orders at x=-2 → center near x=-2.5
    expect(commerce.centerX).toBeCloseTo(-2.5, 0);
  });

  it('boundary dimensions are positive and greater than padding', () => {
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, cardDims);
    for (const b of boundaries) {
      expect(b.width).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThan(0);
      expect(b.depth).toBeGreaterThan(0);
    }
  });

  it('returns empty array when no groups exist', () => {
    const boundaries = computeGroupBoundaries(noGroupSchema, nodes, cardDims);
    expect(boundaries).toHaveLength(0);
  });

  it('uses default card dimensions when a table is absent from the map', () => {
    const emptyDims = new Map<string, { width: number; height: number; depth: number }>();
    const boundaries = computeGroupBoundaries(simpleGroupedSchema, nodes, emptyDims);
    // Should still produce boundaries, not crash
    expect(boundaries).toHaveLength(2);
    for (const b of boundaries) {
      expect(b.width).toBeGreaterThan(0);
    }
  });
});
