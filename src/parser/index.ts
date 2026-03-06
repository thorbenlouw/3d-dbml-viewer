import { Parser } from '@dbml/core';
import type { ParsedColumn, ParsedRef, ParsedSchema } from '@/types';

interface DbmlField {
  name: string;
  pk?: boolean;
  unique?: boolean;
  not_null?: boolean;
  note?: string;
  type?: {
    type_name?: string;
  };
}

interface DbmlTable {
  name: string;
  note?: string;
  fields: DbmlField[];
  group?: {
    name?: unknown;
  } | null;
}

interface DbmlRefEndpoint {
  tableName: string;
  fieldNames: string[];
  relation: string;
}

interface DbmlRef {
  endpoints: [DbmlRefEndpoint, DbmlRefEndpoint];
}

interface DbmlSchema {
  tables: DbmlTable[];
  refs: DbmlRef[];
}

interface DbmlDatabase {
  schemas: DbmlSchema[];
  name?: string;
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
    };
  });
}

function mapRefs(schemas: DbmlSchema[]): ParsedRef[] {
  return schemas.flatMap((schema) =>
    schema.refs.map((ref, index) => {
      const source = ref.endpoints[0];
      const target = ref.endpoints[1];
      return {
        id: `${source.tableName}:${source.fieldNames.join(',')}->${target.tableName}:${target.fieldNames.join(',')}:${index}`,
        sourceId: source.tableName,
        targetId: target.tableName,
        sourceFieldNames: [...source.fieldNames],
        targetFieldNames: [...target.fieldNames],
        sourceRelation: source.relation,
        targetRelation: target.relation,
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
      };
    }),
  );

  const refs = mapRefs(database.schemas);

  const rawProjectName = database.name?.trim();
  const projectName =
    rawProjectName !== undefined && rawProjectName.length > 0 ? rawProjectName : undefined;

  return { tables, refs, projectName };
}
