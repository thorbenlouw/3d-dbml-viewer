import { describe, it, expect } from 'vitest';
import { parseDatabaseSchema } from '@/parser';
import { computeLayout } from '@/layout';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

describe('parser -> layout pipeline', () => {
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

  it('DBML -> schema -> layout retains users, posts, follows and field metadata', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);

    const names = nodes.map((n) => n.name).sort();
    expect(names).toEqual(['follows', 'posts', 'users']);

    const users = schema.tables.find((t) => t.name === 'users');
    const posts = schema.tables.find((t) => t.name === 'posts');
    const follows = schema.tables.find((t) => t.name === 'follows');

    expect(users?.columns.map((column) => column.name)).toEqual([
      'id',
      'username',
      'role',
      'created_at',
    ]);
    expect(users?.columns.find((column) => column.name === 'id')).toMatchObject({
      isPrimaryKey: true,
      isForeignKey: false,
      isNotNull: false,
      isUnique: false,
    });

    expect(posts?.columns.find((column) => column.name === 'user_id')).toMatchObject({
      type: 'integer',
      isForeignKey: true,
      isNotNull: true,
    });

    expect(follows?.columns.find((column) => column.name === 'following_user_id')).toMatchObject({
      isForeignKey: true,
    });
    expect(follows?.columns.find((column) => column.name === 'followed_user_id')).toMatchObject({
      isForeignKey: true,
    });

    expect(schema.refs).toHaveLength(3);
  });
});
