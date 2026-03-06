import { describe, expect, it } from 'vitest';
import type { HoverContext, ParsedSchema, RelationshipLinkModel } from '@/types';
import {
  getInboundReferencesForContext,
  getReferencedTablesForTable,
  shouldHighlightRelationship,
} from '@/renderer/hoverContext';

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

// Schema used for inbound-reference tests:
//   r1: users.id → posts.author_id
//   r2: users.id → comments.author_id
//   r3: users.id → posts.editor_id
// So posts/comments are the TARGETS; users is always the SOURCE.

describe('getInboundReferencesForContext', () => {
  describe('field hover', () => {
    it('returns referencedByFields listing fields that reference the hovered field', () => {
      // posts.author_id is the TARGET of r1; users.id is the source
      const hover = makeHoverContext({
        tableId: 'posts',
        tableName: 'posts',
        columnName: 'author_id',
      });
      const result = getInboundReferencesForContext(schemaFixture, hover);
      expect(result.referencedByFields).toEqual(['users.id']);
      expect(result.referencedByTables).toBeUndefined();
    });

    it('collects multiple inbound field refs sorted alphabetically', () => {
      // posts.editor_id is the TARGET of r3; posts.author_id is the TARGET of r1
      // Both have users.id as source — let's pick a field that multiple sources point to
      const multiSourceSchema: ParsedSchema = {
        tables: [
          { id: 'a', name: 'a', columns: [] },
          { id: 'b', name: 'b', columns: [] },
          { id: 'target', name: 'target', columns: [] },
        ],
        refs: [
          {
            id: 'x1',
            sourceId: 'b',
            targetId: 'target',
            sourceFieldNames: ['ref_id'],
            targetFieldNames: ['id'],
          },
          {
            id: 'x2',
            sourceId: 'a',
            targetId: 'target',
            sourceFieldNames: ['ref_id'],
            targetFieldNames: ['id'],
          },
        ],
      };
      const hover = makeHoverContext({ tableId: 'target', tableName: 'target', columnName: 'id' });
      const result = getInboundReferencesForContext(multiSourceSchema, hover);
      expect(result.referencedByFields).toEqual(['a.ref_id', 'b.ref_id']);
    });

    it('returns empty object when no field references the hovered field', () => {
      // users.id is always the SOURCE, never a target in schemaFixture
      const hover = makeHoverContext({ tableId: 'users', tableName: 'users', columnName: 'id' });
      const result = getInboundReferencesForContext(schemaFixture, hover);
      expect(result.referencedByFields).toBeUndefined();
      expect(result.referencedByTables).toBeUndefined();
    });

    it('includes self-references when present', () => {
      const selfRefSchema: ParsedSchema = {
        tables: [{ id: 'category', name: 'category', columns: [] }],
        refs: [
          {
            id: 'sr1',
            sourceId: 'category',
            targetId: 'category',
            sourceFieldNames: ['parent_id'],
            targetFieldNames: ['id'],
          },
        ],
      };
      const hover = makeHoverContext({
        tableId: 'category',
        tableName: 'category',
        columnName: 'id',
      });
      const result = getInboundReferencesForContext(selfRefSchema, hover);
      expect(result.referencedByFields).toEqual(['category.parent_id']);
    });
  });

  describe('table hover', () => {
    it('returns referencedByTables when other tables reference the hovered table', () => {
      // posts is the target of r1 and r3; source is users in both
      const hover = makeHoverContext({
        tableId: 'posts',
        tableName: 'posts',
        columnName: undefined,
      });
      const result = getInboundReferencesForContext(schemaFixture, hover);
      expect(result.referencedByTables).toEqual(['users']);
      expect(result.referencedByFields).toBeUndefined();
    });

    it('deduplicates table names when multiple refs from the same source exist', () => {
      // users references posts via r1 (author_id) and r3 (editor_id) — should only appear once
      const hover = makeHoverContext({
        tableId: 'posts',
        tableName: 'posts',
        columnName: undefined,
      });
      const result = getInboundReferencesForContext(schemaFixture, hover);
      expect(result.referencedByTables).toEqual(['users']);
    });

    it('returns sorted table names', () => {
      const multiSourceSchema: ParsedSchema = {
        tables: [
          { id: 'aaa', name: 'aaa', columns: [] },
          { id: 'bbb', name: 'bbb', columns: [] },
          { id: 'target', name: 'target', columns: [] },
        ],
        refs: [
          {
            id: 'y1',
            sourceId: 'bbb',
            targetId: 'target',
            sourceFieldNames: ['fk'],
            targetFieldNames: ['id'],
          },
          {
            id: 'y2',
            sourceId: 'aaa',
            targetId: 'target',
            sourceFieldNames: ['fk'],
            targetFieldNames: ['id'],
          },
        ],
      };
      const hover = makeHoverContext({
        tableId: 'target',
        tableName: 'target',
        columnName: undefined,
      });
      const result = getInboundReferencesForContext(multiSourceSchema, hover);
      expect(result.referencedByTables).toEqual(['aaa', 'bbb']);
    });

    it('returns empty object when no table references the hovered table', () => {
      // users is always the source, never a target
      const hover = makeHoverContext({
        tableId: 'users',
        tableName: 'users',
        columnName: undefined,
      });
      const result = getInboundReferencesForContext(schemaFixture, hover);
      expect(result.referencedByTables).toBeUndefined();
      expect(result.referencedByFields).toBeUndefined();
    });

    it('includes self-references when present', () => {
      const selfRefSchema: ParsedSchema = {
        tables: [{ id: 'category', name: 'category', columns: [] }],
        refs: [
          {
            id: 'sr1',
            sourceId: 'category',
            targetId: 'category',
            sourceFieldNames: ['parent_id'],
            targetFieldNames: ['id'],
          },
        ],
      };
      const hover = makeHoverContext({
        tableId: 'category',
        tableName: 'category',
        columnName: undefined,
      });
      const result = getInboundReferencesForContext(selfRefSchema, hover);
      expect(result.referencedByTables).toEqual(['category']);
    });
  });
});

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
