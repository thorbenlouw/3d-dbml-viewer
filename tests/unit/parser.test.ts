import { describe, it, expect } from 'vitest';
import { parseDatabaseSchema, ParseError } from '@/parser';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

describe('parseDatabaseSchema', () => {
  it('returns exactly 3 tables for the hard-coded schema', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    expect(schema.tables).toHaveLength(3);
  });

  it('returns tables named users, posts, follows', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const names = schema.tables.map((t) => t.name).sort();
    expect(names).toEqual(['follows', 'posts', 'users']);
  });

  it('returns 3 refs (posts→users, users→follows x2)', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    expect(schema.refs).toHaveLength(3);
  });

  it('includes the posts→users ref', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const hasPostsUsers = schema.refs.some(
      (r) =>
        (r.sourceId === 'posts' && r.targetId === 'users') ||
        (r.sourceId === 'users' && r.targetId === 'posts'),
    );
    expect(hasPostsUsers).toBe(true);
  });

  it('includes refs from users to follows', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const usersFollowsRefs = schema.refs.filter(
      (r) =>
        (r.sourceId === 'users' && r.targetId === 'follows') ||
        (r.sourceId === 'follows' && r.targetId === 'users'),
    );
    expect(usersFollowsRefs).toHaveLength(2);
  });

  it('throws ParseError for malformed DBML', () => {
    expect(() => parseDatabaseSchema('not valid dbml {{{')).toThrow(ParseError);
  });

  it('Records blocks do not produce extra tables', () => {
    const dbmlWithRecords = `
      Table products {
        id integer [primary key]
        name varchar
      }

      TablePartial price_fields {
        price decimal
      }
    `;
    const schema = parseDatabaseSchema(dbmlWithRecords);
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].name).toBe('products');
  });
});
