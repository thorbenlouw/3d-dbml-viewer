import { describe, expect, it } from 'vitest';
import { defaultFilterState } from '@/parser';
import type { ParsedSchema } from '@/types';

function makeSchema(tableCount: number): ParsedSchema {
  return {
    tables: Array.from({ length: tableCount }, (_, index) => ({
      id: `table_${index + 1}`,
      name: `table_${index + 1}`,
      columns: [],
    })),
    refs: [],
  };
}

describe('defaultFilterState', () => {
  it('defaults to full mode for schemas with 30 tables', () => {
    const schema = makeSchema(30);

    const result = defaultFilterState(schema);

    expect(result.fieldDetailMode).toBe('full');
    expect([...result.visibleTableIds]).toEqual(schema.tables.map((table) => table.id));
  });

  it('defaults to table-only mode for schemas with 31 tables', () => {
    const schema = makeSchema(31);

    const result = defaultFilterState(schema);

    expect(result.fieldDetailMode).toBe('table-only');
    expect([...result.visibleTableIds]).toEqual(schema.tables.map((table) => table.id));
  });

  it('sets showTableGroupBoundaries to false when schema has no TableGroups', () => {
    const schema = makeSchema(3);
    const result = defaultFilterState(schema);
    expect(result.showTableGroupBoundaries).toBe(false);
  });

  it('sets showTableGroupBoundaries to true when schema has TableGroups', () => {
    const schema: ParsedSchema = {
      tables: [{ id: 'A', name: 'A', columns: [], tableGroup: 'GroupA' }],
      refs: [],
      tableGroups: [{ name: 'GroupA' }],
    };
    const result = defaultFilterState(schema);
    expect(result.showTableGroupBoundaries).toBe(true);
  });

  it('populates visibleTableGroupIds with all group names', () => {
    const schema: ParsedSchema = {
      tables: [
        { id: 'A', name: 'A', columns: [], tableGroup: 'G1' },
        { id: 'B', name: 'B', columns: [], tableGroup: 'G2' },
      ],
      refs: [],
      tableGroups: [{ name: 'G1' }, { name: 'G2' }],
    };
    const result = defaultFilterState(schema);
    expect(result.visibleTableGroupIds.has('G1')).toBe(true);
    expect(result.visibleTableGroupIds.has('G2')).toBe(true);
    expect(result.visibleTableGroupIds.has('__ungrouped__')).toBe(false);
  });

  it('adds __ungrouped__ sentinel when schema has ungrouped tables', () => {
    const schema: ParsedSchema = {
      tables: [
        { id: 'A', name: 'A', columns: [], tableGroup: 'G1' },
        { id: 'B', name: 'B', columns: [] }, // no tableGroup
      ],
      refs: [],
      tableGroups: [{ name: 'G1' }],
    };
    const result = defaultFilterState(schema);
    expect(result.visibleTableGroupIds.has('__ungrouped__')).toBe(true);
  });

  it('adds __ungrouped__ sentinel even when schema has no TableGroups but has ungrouped tables', () => {
    const schema = makeSchema(2);
    const result = defaultFilterState(schema);
    expect(result.visibleTableGroupIds.has('__ungrouped__')).toBe(true);
  });
});
