import { Parser } from '@dbml/core';
import type {
  FilterState,
  ParsedColumn,
  ParsedColumnDefault,
  ParsedColumnDefaultType,
  ParsedRef,
  ParsedSchema,
  ParsedTableGroup,
} from '@/types';

export { applyFilters } from './applyFilters';

interface DbmlField {
  name: string;
  pk?: boolean;
  unique?: boolean;
  not_null?: boolean;
  note?: string;
  dbdefault?: {
    type?: unknown;
    value?: unknown;
  };
  type?: {
    type_name?: string;
  };
}

interface DbmlTablePartial {
  headerColor?: string;
}

interface DbmlTable {
  name: string;
  note?: string;
  fields: DbmlField[];
  headerColor?: string;
  partials?: DbmlTablePartial[];
  group?: {
    name?: unknown;
    color?: string;
  } | null;
}

interface DbmlRefEndpoint {
  tableName: string;
  fieldNames: string[];
  relation: string;
}

interface DbmlRef {
  endpoints: [DbmlRefEndpoint, DbmlRefEndpoint];
  color?: string;
}

interface DbmlTableGroup {
  name: string;
  color?: string;
}

interface DbmlSchema {
  tables: DbmlTable[];
  refs: DbmlRef[];
  tableGroups?: DbmlTableGroup[];
}

interface DbmlDatabase {
  schemas: DbmlSchema[];
  name?: string;
  note?: string;
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export function defaultFilterState(schema: ParsedSchema): FilterState {
  const hasGroups = (schema.tableGroups?.length ?? 0) > 0;
  const hasUngrouped = schema.tables.some((t) => !t.tableGroup);

  const visibleTableGroupIds = new Set<string>(schema.tableGroups?.map((g) => g.name) ?? []);
  if (hasUngrouped) visibleTableGroupIds.add('__ungrouped__');

  return {
    fieldDetailMode: schema.tables.length > 30 ? 'table-only' : 'full',
    visibleTableIds: new Set(schema.tables.map((table) => table.id)),
    visibleTableGroupIds,
    showTableGroupBoundaries: hasGroups,
  };
}

export function isFilterActive(filterState: FilterState, defaultState: FilterState): boolean {
  if (filterState.fieldDetailMode !== defaultState.fieldDetailMode) return true;
  if (filterState.visibleTableIds.size !== defaultState.visibleTableIds.size) return true;

  for (const tableId of filterState.visibleTableIds) {
    if (!defaultState.visibleTableIds.has(tableId)) return true;
  }

  if (filterState.visibleTableGroupIds.size !== defaultState.visibleTableGroupIds.size) return true;
  for (const groupId of filterState.visibleTableGroupIds) {
    if (!defaultState.visibleTableGroupIds.has(groupId)) return true;
  }

  if (filterState.showTableGroupBoundaries !== defaultState.showTableGroupBoundaries) return true;

  return false;
}

function buildForeignKeyMap(schemas: DbmlSchema[]): Map<string, Set<string>> {
  const foreignKeyByTable = new Map<string, Set<string>>();

  for (const schema of schemas) {
    for (const ref of schema.refs) {
      for (const endpoint of ref.endpoints) {
        if (endpoint.relation !== '*') continue;

        const existing = foreignKeyByTable.get(endpoint.tableName) ?? new Set<string>();
        for (const fieldName of endpoint.fieldNames) {
          existing.add(fieldName);
        }
        foreignKeyByTable.set(endpoint.tableName, existing);
      }
    }
  }

  return foreignKeyByTable;
}

function normalizeFieldDefault(dbdefault: DbmlField['dbdefault']): ParsedColumnDefault | undefined {
  const defaultType = dbdefault?.type;
  if (
    defaultType !== 'number' &&
    defaultType !== 'string' &&
    defaultType !== 'boolean' &&
    defaultType !== 'expression'
  ) {
    return undefined;
  }

  return {
    type: defaultType as ParsedColumnDefaultType,
    value: String(dbdefault?.value),
  };
}

function mapColumns(table: DbmlTable, foreignKeys: Map<string, Set<string>>): ParsedColumn[] {
  const foreignKeyColumns = foreignKeys.get(table.name) ?? new Set<string>();

  return table.fields.map((field) => {
    const rawNote = field.note?.trim();
    return {
      name: field.name,
      type: field.type?.type_name ?? 'unknown',
      isPrimaryKey: Boolean(field.pk),
      isForeignKey: foreignKeyColumns.has(field.name),
      isNotNull: Boolean(field.not_null),
      isUnique: Boolean(field.unique),
      note: rawNote !== undefined && rawNote.length > 0 ? rawNote : undefined,
      default: normalizeFieldDefault(field.dbdefault),
    };
  });
}

function mapRefs(schemas: DbmlSchema[]): ParsedRef[] {
  return schemas.flatMap((schema) =>
    schema.refs.map((ref, index) => {
      const source = ref.endpoints[0];
      const target = ref.endpoints[1];
      const rawColor = ref.color?.trim();
      return {
        id: `${source.tableName}:${source.fieldNames.join(',')}->${target.tableName}:${target.fieldNames.join(',')}:${index}`,
        sourceId: source.tableName,
        targetId: target.tableName,
        sourceFieldNames: [...source.fieldNames],
        targetFieldNames: [...target.fieldNames],
        sourceRelation: source.relation,
        targetRelation: target.relation,
        color: rawColor !== undefined && rawColor.length > 0 ? rawColor : undefined,
      };
    }),
  );
}

function getTableGroupName(table: DbmlTable): string | undefined {
  const rawName = table.group?.name;
  if (typeof rawName !== 'string') return undefined;
  const normalized = rawName.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveTableHeaderColor(table: DbmlTable): string | undefined {
  // Precedence: 1) table-local headerColor, 2) last partial with headerColor, 3) undefined
  const localColor = table.headerColor?.trim();
  if (localColor && localColor.length > 0) return localColor;

  const partials = table.partials;
  if (partials && partials.length > 0) {
    for (let i = partials.length - 1; i >= 0; i--) {
      const partialColor = partials[i].headerColor?.trim();
      if (partialColor && partialColor.length > 0) return partialColor;
    }
  }

  return undefined;
}

function extractTableGroups(schemas: DbmlSchema[]): ParsedTableGroup[] {
  const seen = new Map<string, string | undefined>();
  for (const schema of schemas) {
    for (const group of schema.tableGroups ?? []) {
      if (!seen.has(group.name)) {
        const rawColor = group.color?.trim();
        seen.set(group.name, rawColor && rawColor.length > 0 ? rawColor : undefined);
      }
    }
  }
  return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
}

export function parseDatabaseSchema(dbml: string): ParsedSchema {
  let database: DbmlDatabase;
  try {
    database = Parser.parse(dbml, 'dbmlv2') as unknown as DbmlDatabase;
  } catch (err) {
    throw new ParseError(
      `Failed to parse DBML: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const foreignKeys = buildForeignKeyMap(database.schemas);
  const tables = database.schemas.flatMap((schema) =>
    schema.tables.map((table) => {
      const rawTableNote = table.note?.trim();
      return {
        id: table.name,
        name: table.name,
        columns: mapColumns(table, foreignKeys),
        note: rawTableNote !== undefined && rawTableNote.length > 0 ? rawTableNote : undefined,
        tableGroup: getTableGroupName(table),
        headerColor: resolveTableHeaderColor(table),
      };
    }),
  );

  const refs = mapRefs(database.schemas);
  const tableGroups = extractTableGroups(database.schemas);

  const rawProjectName = database.name?.trim();
  const projectName =
    rawProjectName !== undefined && rawProjectName.length > 0 ? rawProjectName : undefined;

  const rawProjectNote = database.note?.trim();
  const projectNote =
    rawProjectNote !== undefined && rawProjectNote.length > 0 ? rawProjectNote : undefined;

  return { tables, refs, projectName, projectNote, tableGroups };
}
