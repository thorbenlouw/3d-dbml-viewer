import { describe, it, expect } from 'vitest';
import { applyFilters } from '@/parser/applyFilters';
import type { ParsedSchema, FilterState } from '@/types';

const TABLE_A = { id: 'A', name: 'TableA', columns: [] };
const TABLE_B = { id: 'B', name: 'TableB', columns: [] };
const TABLE_C = { id: 'C', name: 'TableC', columns: [] };

const REF_AB = {
  id: 'r_ab',
  sourceId: 'A',
  targetId: 'B',
  sourceFieldNames: [],
  targetFieldNames: [],
};
const REF_AC = {
  id: 'r_ac',
  sourceId: 'A',
  targetId: 'C',
  sourceFieldNames: [],
  targetFieldNames: [],
};
const REF_BC = {
  id: 'r_bc',
  sourceId: 'B',
  targetId: 'C',
  sourceFieldNames: [],
  targetFieldNames: [],
};

const SCHEMA: ParsedSchema = {
  tables: [TABLE_A, TABLE_B, TABLE_C],
  refs: [REF_AB, REF_AC, REF_BC],
};

function makeFilterState(
  visibleIds: string[],
  mode: FilterState['fieldDetailMode'] = 'full',
): FilterState {
  return {
    fieldDetailMode: mode,
    visibleTableIds: new Set(visibleIds),
  };
}

describe('applyFilters', () => {
  it('returns all tables and refs when all tables are visible', () => {
    const result = applyFilters(SCHEMA, makeFilterState(['A', 'B', 'C']));
    expect(result.tables).toHaveLength(3);
    expect(result.refs).toHaveLength(3);
  });

  it('removes a hidden table and all its edges', () => {
    const result = applyFilters(SCHEMA, makeFilterState(['A', 'C']));

    expect(result.tables.map((t) => t.id)).toEqual(['A', 'C']);
    // REF_AB (involves B) and REF_BC (involves B) should be removed; REF_AC stays
    expect(result.refs).toHaveLength(1);
    expect(result.refs[0].id).toBe('r_ac');
  });

  it('removes an edge only when at least one endpoint is hidden', () => {
    const result = applyFilters(SCHEMA, makeFilterState(['A', 'B']));

    expect(result.tables.map((t) => t.id)).toEqual(['A', 'B']);
    // REF_AC and REF_BC involve C which is hidden
    expect(result.refs).toHaveLength(1);
    expect(result.refs[0].id).toBe('r_ab');
  });

  it('returns an empty schema when no tables are visible', () => {
    const result = applyFilters(SCHEMA, makeFilterState([]));
    expect(result.tables).toHaveLength(0);
    expect(result.refs).toHaveLength(0);
  });

  it('preserves schema-level metadata (projectName, projectNote, tableGroups)', () => {
    const schemaWithMeta: ParsedSchema = {
      ...SCHEMA,
      projectName: 'TestProject',
      projectNote: 'A note',
      tableGroups: [{ name: 'G1' }],
    };
    const result = applyFilters(schemaWithMeta, makeFilterState(['A']));
    expect(result.projectName).toBe('TestProject');
    expect(result.projectNote).toBe('A note');
    expect(result.tableGroups).toEqual([{ name: 'G1' }]);
  });

  it('does not mutate the original schema', () => {
    const originalTableCount = SCHEMA.tables.length;
    const originalRefCount = SCHEMA.refs.length;
    applyFilters(SCHEMA, makeFilterState(['A']));
    expect(SCHEMA.tables).toHaveLength(originalTableCount);
    expect(SCHEMA.refs).toHaveLength(originalRefCount);
  });
});
