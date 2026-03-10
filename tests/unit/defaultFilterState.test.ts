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
});
