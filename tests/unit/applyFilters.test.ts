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
  visibleGroupIds: string[] = [],
): FilterState {
  return {
    fieldDetailMode: mode,
    visibleTableIds: new Set(visibleIds),
    visibleTableGroupIds: new Set(['__ungrouped__', ...visibleGroupIds]),
    showTableGroupBoundaries: false,
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

describe('applyFilters — group × table intersection', () => {
  const TABLE_G1_X = { id: 'X', name: 'X', columns: [], tableGroup: 'G1' };
  const TABLE_G1_Y = { id: 'Y', name: 'Y', columns: [], tableGroup: 'G1' };
  const TABLE_G2_Z = { id: 'Z', name: 'Z', columns: [], tableGroup: 'G2' };
  const TABLE_UNGROUPED = { id: 'U', name: 'U', columns: [] };

  const REF_XZ = { id: 'r_xz', sourceId: 'X', targetId: 'Z', sourceFieldNames: [], targetFieldNames: [] };
  const REF_XU = { id: 'r_xu', sourceId: 'X', targetId: 'U', sourceFieldNames: [], targetFieldNames: [] };

  const GROUPED_SCHEMA: ParsedSchema = {
    tables: [TABLE_G1_X, TABLE_G1_Y, TABLE_G2_Z, TABLE_UNGROUPED],
    refs: [REF_XZ, REF_XU],
    tableGroups: [{ name: 'G1' }, { name: 'G2' }],
  };

  it('hides all tables in a group when the group is removed from visibleTableGroupIds', () => {
    const filterState = {
      fieldDetailMode: 'full' as const,
      visibleTableIds: new Set(['X', 'Y', 'Z', 'U']),
      visibleTableGroupIds: new Set(['G2', '__ungrouped__']), // G1 hidden
      showTableGroupBoundaries: true,
    };
    const result = applyFilters(GROUPED_SCHEMA, filterState);
    expect(result.tables.map((t) => t.id)).toEqual(['Z', 'U']);
  });

  it('removes refs to hidden-group tables', () => {
    const filterState = {
      fieldDetailMode: 'full' as const,
      visibleTableIds: new Set(['X', 'Y', 'Z', 'U']),
      visibleTableGroupIds: new Set(['G2', '__ungrouped__']), // G1 hidden → X and Y invisible
      showTableGroupBoundaries: true,
    };
    const result = applyFilters(GROUPED_SCHEMA, filterState);
    // REF_XZ and REF_XU both involve X which is in hidden G1
    expect(result.refs).toHaveLength(0);
  });

  it('hides ungrouped tables when __ungrouped__ is removed', () => {
    const filterState = {
      fieldDetailMode: 'full' as const,
      visibleTableIds: new Set(['X', 'Y', 'Z', 'U']),
      visibleTableGroupIds: new Set(['G1', 'G2']), // __ungrouped__ absent
      showTableGroupBoundaries: true,
    };
    const result = applyFilters(GROUPED_SCHEMA, filterState);
    expect(result.tables.map((t) => t.id)).not.toContain('U');
    expect(result.tables.map((t) => t.id)).toEqual(['X', 'Y', 'Z']);
  });

  it('keeps per-table hidden state when group is re-shown', () => {
    // Y is hidden per-table, even though its group G1 is visible
    const filterState = {
      fieldDetailMode: 'full' as const,
      visibleTableIds: new Set(['X', 'Z', 'U']), // Y hidden per-table
      visibleTableGroupIds: new Set(['G1', 'G2', '__ungrouped__']),
      showTableGroupBoundaries: true,
    };
    const result = applyFilters(GROUPED_SCHEMA, filterState);
    expect(result.tables.map((t) => t.id)).not.toContain('Y');
    expect(result.tables.map((t) => t.id)).toContain('X');
  });
});
