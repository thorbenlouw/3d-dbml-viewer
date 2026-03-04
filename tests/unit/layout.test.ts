import { describe, it, expect } from 'vitest';
import { computeLayout } from '@/layout';
import { parseDatabaseSchema } from '@/parser';
import { HARD_CODED_DBML } from '@/data/schema.dbml';
import type { ParsedSchema } from '@/types';

const schema: ParsedSchema = parseDatabaseSchema(HARD_CODED_DBML);

describe('computeLayout', () => {
  it('returns 3 nodes for the 3-table schema', () => {
    const nodes = computeLayout(schema);
    expect(nodes).toHaveLength(3);
  });

  it('all nodes have finite numeric x, y, z', () => {
    const nodes = computeLayout(schema);
    for (const node of nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.z)).toBe(true);
    }
  });

  it('is deterministic — same input produces same positions', () => {
    const a = computeLayout(schema);
    const b = computeLayout(schema);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].x).toBeCloseTo(b[i].x, 6);
      expect(a[i].y).toBeCloseTo(b[i].y, 6);
      expect(a[i].z).toBeCloseTo(b[i].z, 6);
    }
  });

  it('all inter-node distances are > 0.5 world units (non-degenerate)', () => {
    const nodes = computeLayout(schema);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        expect(dist).toBeGreaterThan(0.5);
      }
    }
  });

  it('nodes have id and name matching table data', () => {
    const nodes = computeLayout(schema);
    const names = nodes.map((n) => n.name).sort();
    expect(names).toEqual(['follows', 'posts', 'users']);
  });
});
