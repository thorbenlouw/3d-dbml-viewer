import { describe, it, expect } from 'vitest';
import { parseDatabaseSchema, ParseError } from '@/parser';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

function findTable(tableName: string) {
  const schema = parseDatabaseSchema(HARD_CODED_DBML);
  const table = schema.tables.find((entry) => entry.name === tableName);
  if (!table) {
    throw new Error(`Expected table ${tableName} to exist`);
  }
  return table;
}

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

  it('extracts field names and types for all hard-coded tables', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);

    const tableToFields = Object.fromEntries(
      schema.tables.map((table) => [
        table.name,
        table.columns.map((column) => `${column.name}:${column.type}`),
      ]),
    );

    expect(tableToFields.users).toEqual([
      'id:integer',
      'username:varchar',
      'role:varchar',
      'created_at:timestamp',
    ]);
    expect(tableToFields.posts).toEqual([
      'id:integer',
      'title:varchar',
      'body:text',
      'user_id:integer',
      'status:varchar',
      'created_at:timestamp',
    ]);
    expect(tableToFields.follows).toEqual([
      'following_user_id:integer',
      'followed_user_id:integer',
      'created_at:timestamp',
    ]);
  });

  it('captures PK and NN flags from DBML settings', () => {
    const users = findTable('users');
    const posts = findTable('posts');

    const usersId = users.columns.find((column) => column.name === 'id');
    const postsUserId = posts.columns.find((column) => column.name === 'user_id');

    expect(usersId?.isPrimaryKey).toBe(true);
    expect(usersId?.isNotNull).toBe(false);

    expect(postsUserId?.isPrimaryKey).toBe(false);
    expect(postsUserId?.isNotNull).toBe(true);
  });

  it('derives FK flags from refs for posts.user_id and follows.*_user_id', () => {
    const posts = findTable('posts');
    const follows = findTable('follows');

    const postsFk = posts.columns.find((column) => column.name === 'user_id');
    const followsFollowingFk = follows.columns.find(
      (column) => column.name === 'following_user_id',
    );
    const followsFollowedFk = follows.columns.find((column) => column.name === 'followed_user_id');

    expect(postsFk?.isForeignKey).toBe(true);
    expect(followsFollowingFk?.isForeignKey).toBe(true);
    expect(followsFollowedFk?.isForeignKey).toBe(true);
  });

  it('keeps table-level refs for layout and link rendering', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    expect(schema.refs).toHaveLength(3);

    const refs = schema.refs.map((ref) => ({
      sourceId: ref.sourceId,
      targetId: ref.targetId,
      sourceFieldNames: ref.sourceFieldNames,
      targetFieldNames: ref.targetFieldNames,
    }));

    expect(refs).toEqual([
      {
        sourceId: 'posts',
        targetId: 'users',
        sourceFieldNames: ['user_id'],
        targetFieldNames: ['id'],
      },
      {
        sourceId: 'users',
        targetId: 'follows',
        sourceFieldNames: ['id'],
        targetFieldNames: ['following_user_id'],
      },
      {
        sourceId: 'users',
        targetId: 'follows',
        sourceFieldNames: ['id'],
        targetFieldNames: ['followed_user_id'],
      },
    ]);
  });

  it('throws ParseError for malformed DBML', () => {
    expect(() => parseDatabaseSchema('not valid dbml {{{')).toThrow(ParseError);
  });

  it('TablePartial blocks do not produce extra tables', () => {
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
