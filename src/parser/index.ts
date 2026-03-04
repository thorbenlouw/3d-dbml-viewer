import { Parser } from '@dbml/core';
import type { ParsedColumn, ParsedRef, ParsedSchema } from '@/types';

interface DbmlField {
  name: string;
  pk?: boolean;
  unique?: boolean;
  not_null?: boolean;
  type?: {
    type_name?: string;
  };
}

interface DbmlTable {
  name: string;
  fields: DbmlField[];
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

  return table.fields.map((field) => ({
    name: field.name,
    type: field.type?.type_name ?? 'unknown',
    isPrimaryKey: Boolean(field.pk),
    isForeignKey: foreignKeyColumns.has(field.name),
    isNotNull: Boolean(field.not_null),
    isUnique: Boolean(field.unique),
  }));
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
      };
    }),
  );
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
    schema.tables.map((table) => ({
      id: table.name,
      name: table.name,
      columns: mapColumns(table, foreignKeys),
    })),
  );

  const refs = mapRefs(database.schemas);

  return { tables, refs };
}
