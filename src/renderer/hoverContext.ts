import type { HoverContext, ParsedSchema, ReferenceItem, RelationshipLinkModel } from '@/types';

function formatCardinality(source?: string, target?: string): string | undefined {
  if (!source || !target) return undefined;
  const s = source === '*' ? '*' : '1';
  const t = target === '*' ? '*' : '1';
  if (s === '*' && t === '*') return 'm..n';
  return `${s}..${t}`;
}

export interface ReferencesForContext {
  title: string;
  items: ReferenceItem[];
}

export function getReferencesForContext(
  schema: ParsedSchema,
  hoverContext: HoverContext,
): ReferencesForContext {
  const tableNameById = new Map(schema.tables.map((t) => [t.id, t.name]));

  if (hoverContext.columnName) {
    const { tableId, columnName } = hoverContext;
    const items: ReferenceItem[] = [];

    for (const ref of schema.refs) {
      const cardinality = formatCardinality(ref.sourceRelation, ref.targetRelation);
      if (ref.sourceId === tableId && ref.sourceFieldNames.includes(columnName)) {
        const targetTableName = tableNameById.get(ref.targetId) ?? ref.targetId;
        for (const fieldName of ref.targetFieldNames) {
          items.push({ label: `${targetTableName}.${fieldName}`, cardinality });
        }
      } else if (ref.targetId === tableId && ref.targetFieldNames.includes(columnName)) {
        const sourceTableName = tableNameById.get(ref.sourceId) ?? ref.sourceId;
        for (const fieldName of ref.sourceFieldNames) {
          items.push({ label: `${sourceTableName}.${fieldName}`, cardinality });
        }
      }
    }

    return { title: 'Referenced fields', items };
  }

  const uniqueNames = new Set<string>();
  for (const ref of schema.refs) {
    if (ref.sourceId === hoverContext.tableId) {
      uniqueNames.add(tableNameById.get(ref.targetId) ?? ref.targetId);
    }
  }
  return {
    title: 'Referenced tables',
    items: [...uniqueNames].map((label) => ({ label })),
  };
}

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
