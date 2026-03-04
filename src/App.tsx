import { parseDatabaseSchema, ParseError } from '@/parser';
import { HARD_CODED_DBML } from '@/data/schema.dbml';
import Scene from '@/renderer/Scene';
import type { ParsedSchema } from '@/types';
import type { ReactElement } from 'react';

interface AppData {
  schema: ParsedSchema;
  error: string | null;
}

function buildAppData(): AppData {
  try {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    return { schema, error: null };
  } catch (err) {
    if (err instanceof ParseError) {
      console.error('ParseError:', err.message, err.cause);
      return { schema: { tables: [], refs: [] }, error: err.message };
    }
    console.error('Unexpected error:', err);
    return {
      schema: { tables: [], refs: [] },
      error: 'An unexpected error occurred',
    };
  }
}

const INITIAL_DATA: AppData = buildAppData();

export default function App(): ReactElement {
  if (INITIAL_DATA.error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#c00' }}>
        <strong>Error loading schema:</strong> {INITIAL_DATA.error}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100dvw',
        height: '100dvh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Scene schema={INITIAL_DATA.schema} />
    </div>
  );
}
