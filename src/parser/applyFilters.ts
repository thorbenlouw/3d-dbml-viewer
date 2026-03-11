import type { ParsedSchema, FilterState } from '@/types';

/**
 * Returns a derived schema containing only the tables whose IDs appear in
 * filterState.visibleTableIds, plus only the refs where **both** endpoint
 * tables are visible.
 *
 * The returned schema is a shallow clone — callers must not mutate it.
 */
export function applyFilters(schema: ParsedSchema, filterState: FilterState): ParsedSchema {
  const { visibleTableIds, visibleTableGroupIds } = filterState;

  const tables = schema.tables.filter((t) => {
    const groupKey = t.tableGroup ?? '__ungrouped__';
    return visibleTableIds.has(t.id) && visibleTableGroupIds.has(groupKey);
  });

  const visibleIds = new Set(tables.map((t) => t.id));

  const refs = schema.refs.filter(
    (r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId),
  );

  return {
    ...schema,
    tables,
    refs,
  };
}
