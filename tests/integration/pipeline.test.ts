import { describe, it, expect } from 'vitest';
import { parseDatabaseSchema } from '@/parser';
import { computeLayout } from '@/layout';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

describe('parser → layout pipeline', () => {
  it('returns exactly 3 LayoutNode objects', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);
    expect(nodes).toHaveLength(3);
  });

  it('each node has id, name, and finite x, y, z', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);
    for (const node of nodes) {
      expect(typeof node.id).toBe('string');
      expect(typeof node.name).toBe('string');
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.z)).toBe(true);
    }
  });

  it('node names are users, posts, follows (order-insensitive)', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);
    const names = nodes.map((n) => n.name).sort();
    expect(names).toEqual(['follows', 'posts', 'users']);
  });
});
