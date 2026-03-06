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

function buildFullNameById(schema: ParsedSchema): Map<string, string> {
  return new Map(
    schema.tables.map((t) => [t.id, t.tableGroup ? `${t.tableGroup}.${t.name}` : t.name]),
  );
}

export function getReferencesForContext(
  schema: ParsedSchema,
  hoverContext: HoverContext,
): ReferencesForContext {
  const fullNameById = buildFullNameById(schema);

  if (hoverContext.columnName) {
    const { tableId, columnName } = hoverContext;
    const items: ReferenceItem[] = [];

    for (const ref of schema.refs) {
      const cardinality = formatCardinality(ref.sourceRelation, ref.targetRelation);
      if (ref.sourceId === tableId && ref.sourceFieldNames.includes(columnName)) {
        const targetTableName = fullNameById.get(ref.targetId) ?? ref.targetId;
        for (const fieldName of ref.targetFieldNames) {
          items.push({ label: `${targetTableName}.${fieldName}`, cardinality });
        }
      } else if (ref.targetId === tableId && ref.targetFieldNames.includes(columnName)) {
        const sourceTableName = fullNameById.get(ref.sourceId) ?? ref.sourceId;
        for (const fieldName of ref.sourceFieldNames) {
          items.push({ label: `${sourceTableName}.${fieldName}`, cardinality });
        }
      }
    }

    return { title: 'References', items };
  }

  const uniqueNames = new Set<string>();
  for (const ref of schema.refs) {
    if (ref.sourceId === hoverContext.tableId) {
      uniqueNames.add(fullNameById.get(ref.targetId) ?? ref.targetId);
    }
  }
  return {
    title: 'References',
    items: [...uniqueNames].map((label) => ({ label })),
  };
}

export function getInboundReferencesForContext(
  schema: ParsedSchema,
  hoverContext: HoverContext,
): Pick<HoverContext, 'referencedByFields' | 'referencedByTables'> {
  const fullNameById = buildFullNameById(schema);

  if (hoverContext.columnName) {
    const { tableId, columnName } = hoverContext;
    const referencingFields = new Set<string>();

    for (const ref of schema.refs) {
      if (ref.targetId === tableId && ref.targetFieldNames.includes(columnName)) {
        const sourceTableName = fullNameById.get(ref.sourceId) ?? ref.sourceId;
        for (const fieldName of ref.sourceFieldNames) {
          referencingFields.add(`${sourceTableName}.${fieldName}`);
        }
      }
    }

    const sorted = [...referencingFields].sort();
    return sorted.length > 0 ? { referencedByFields: sorted } : {};
  }

  const { tableId } = hoverContext;
  const referencingTables = new Set<string>();

  for (const ref of schema.refs) {
    if (ref.targetId === tableId) {
      referencingTables.add(fullNameById.get(ref.sourceId) ?? ref.sourceId);
    }
  }

  const sorted = [...referencingTables].sort();
  return sorted.length > 0 ? { referencedByTables: sorted } : {};
}

export function getReferencedTablesForTable(schema: ParsedSchema, tableId: string): string[] {
  const fullNameById = buildFullNameById(schema);
  const uniqueNames = new Set<string>();

  for (const ref of schema.refs) {
    if (ref.sourceId !== tableId) continue;
    uniqueNames.add(fullNameById.get(ref.targetId) ?? ref.targetId);
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
