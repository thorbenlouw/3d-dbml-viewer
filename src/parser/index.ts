import { Parser } from '@dbml/core';
import type { ParsedSchema } from '@/types';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export function parseDatabaseSchema(dbml: string): ParsedSchema {
  let database;
  try {
    database = Parser.parse(dbml, 'dbmlv2');
  } catch (err) {
    throw new ParseError(
      `Failed to parse DBML: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const tables = database.schemas.flatMap((schema) =>
    schema.tables.map((table) => ({
      id: table.name,
      name: table.name,
    })),
  );

  const refs = database.schemas.flatMap((schema) =>
    schema.refs.map((ref) => ({
      sourceId: ref.endpoints[0].tableName,
      targetId: ref.endpoints[1].tableName,
    })),
  );

  return { tables, refs };
}
