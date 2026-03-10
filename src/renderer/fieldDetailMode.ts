import type { FieldDetailMode, ParsedColumn, ParsedSchema, ParsedTable } from '@/types';

const EMPTY_FIELD_NAMES = new Set<string>();

export function buildReferencedFieldLookup(schema: ParsedSchema): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();

  for (const ref of schema.refs) {
    const sourceFields = lookup.get(ref.sourceId) ?? new Set<string>();
    const targetFields = lookup.get(ref.targetId) ?? new Set<string>();

    for (const fieldName of ref.sourceFieldNames) {
      sourceFields.add(fieldName);
    }
    for (const fieldName of ref.targetFieldNames) {
      targetFields.add(fieldName);
    }

    lookup.set(ref.sourceId, sourceFields);
    lookup.set(ref.targetId, targetFields);
  }

  return lookup;
}

export function getVisibleColumns(
  table: ParsedTable,
  mode: FieldDetailMode,
  referencedFieldNames: ReadonlySet<string> = EMPTY_FIELD_NAMES,
): ParsedColumn[] {
  if (mode === 'table-only') return [];
  if (mode === 'full') return table.columns;

  return table.columns.filter((column) => referencedFieldNames.has(column.name));
}
