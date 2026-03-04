import type { HoverContext, ParsedSchema, RelationshipLinkModel } from '@/types';

export function getReferencedTablesForTable(schema: ParsedSchema, tableId: string): string[] {
  const tableNameById = new Map(schema.tables.map((table) => [table.id, table.name]));
  const uniqueNames = new Set<string>();

  for (const ref of schema.refs) {
    if (ref.sourceId !== tableId) continue;
    uniqueNames.add(tableNameById.get(ref.targetId) ?? ref.targetId);
  }

  return [...uniqueNames];
}

export function shouldHighlightRelationship(
  hoverContext: HoverContext | null,
  link: Pick<
    RelationshipLinkModel,
    'sourceId' | 'targetId' | 'sourceFieldNames' | 'targetFieldNames'
  >,
): boolean {
  if (!hoverContext?.columnName) return false;

  const { tableId, columnName } = hoverContext;
  const matchesSource = link.sourceId === tableId && link.sourceFieldNames.includes(columnName);
  const matchesTarget = link.targetId === tableId && link.targetFieldNames.includes(columnName);
  return matchesSource || matchesTarget;
}
