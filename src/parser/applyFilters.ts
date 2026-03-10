import type { ParsedSchema, FilterState } from '@/types';

/**
 * Returns a derived schema containing only the tables whose IDs appear in
 * filterState.visibleTableIds, plus only the refs where **both** endpoint
 * tables are visible.
 *
 * The returned schema is a shallow clone — callers must not mutate it.
 */
export function applyFilters(schema: ParsedSchema, filterState: FilterState): ParsedSchema {
  const { visibleTableIds } = filterState;

  const tables = schema.tables.filter((t) => visibleTableIds.has(t.id));

  const refs = schema.refs.filter(
    (r) => visibleTableIds.has(r.sourceId) && visibleTableIds.has(r.targetId),
  );

  return {
    ...schema,
    tables,
    refs,
  };
}
