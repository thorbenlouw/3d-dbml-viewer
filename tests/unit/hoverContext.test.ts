import { describe, expect, it } from 'vitest';
import type { HoverContext, ParsedSchema, RelationshipLinkModel } from '@/types';
import { getReferencedTablesForTable, shouldHighlightRelationship } from '@/renderer/hoverContext';

const schemaFixture: ParsedSchema = {
  tables: [
    { id: 'users', name: 'users', columns: [] },
    { id: 'posts', name: 'posts', columns: [] },
    { id: 'comments', name: 'comments', columns: [] },
  ],
  refs: [
    {
      id: 'r1',
      sourceId: 'users',
      targetId: 'posts',
      sourceFieldNames: ['id'],
      targetFieldNames: ['author_id'],
    },
    {
      id: 'r2',
      sourceId: 'users',
      targetId: 'comments',
      sourceFieldNames: ['id'],
      targetFieldNames: ['author_id'],
    },
    {
      id: 'r3',
      sourceId: 'users',
      targetId: 'posts',
      sourceFieldNames: ['id'],
      targetFieldNames: ['editor_id'],
    },
  ],
};

function makeLink(overrides: Partial<RelationshipLinkModel>): RelationshipLinkModel {
  return {
    id: 'link',
    sourceId: 'users',
    targetId: 'posts',
    sourceFieldNames: ['id'],
    targetFieldNames: ['author_id'],
    linkIndex: 0,
    parallelCount: 1,
    ...overrides,
  };
}

function makeHoverContext(overrides: Partial<HoverContext>): HoverContext {
  return {
    tableId: 'users',
    tableName: 'users',
    columnName: 'id',
    ...overrides,
  };
}

describe('getReferencedTablesForTable', () => {
  it('returns an empty list when there are no outgoing refs', () => {
    const refs = getReferencedTablesForTable(schemaFixture, 'comments');
    expect(refs).toEqual([]);
  });

  it('returns unique referenced table names in encounter order', () => {
    const refs = getReferencedTablesForTable(schemaFixture, 'users');
    expect(refs).toEqual(['posts', 'comments']);
  });
});

describe('shouldHighlightRelationship', () => {
  it('returns false when hover context is null', () => {
    expect(shouldHighlightRelationship(null, makeLink({}))).toBe(false);
  });

  it('returns false for table-level hover without a column', () => {
    const hover = makeHoverContext({ columnName: undefined });
    expect(shouldHighlightRelationship(hover, makeLink({}))).toBe(false);
  });

  it('matches source-side column references', () => {
    const hover = makeHoverContext({ tableId: 'users', columnName: 'id' });
    const link = makeLink({ sourceId: 'users', sourceFieldNames: ['id', 'tenant_id'] });
    expect(shouldHighlightRelationship(hover, link)).toBe(true);
  });

  it('matches target-side column references', () => {
    const hover = makeHoverContext({
      tableId: 'posts',
      tableName: 'posts',
      columnName: 'author_id',
    });
    const link = makeLink({ targetId: 'posts', targetFieldNames: ['author_id'] });
    expect(shouldHighlightRelationship(hover, link)).toBe(true);
  });

  it('returns false when hovered column does not match either endpoint', () => {
    const hover = makeHoverContext({ tableId: 'users', columnName: 'email' });
    expect(shouldHighlightRelationship(hover, makeLink({}))).toBe(false);
  });
});
