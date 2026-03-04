import { parseDatabaseSchema, ParseError } from '@/parser';
import { computeLayout } from '@/layout';
import { HARD_CODED_DBML } from '@/data/schema.dbml';
import Scene from '@/renderer/Scene';
import type { LayoutNode } from '@/types';
import type { ReactElement } from 'react';

function buildNodes(): { nodes: LayoutNode[]; error: string | null } {
  try {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    return { nodes: computeLayout(schema), error: null };
  } catch (err) {
    if (err instanceof ParseError) {
      console.error('ParseError:', err.message, err.cause);
      return { nodes: [], error: err.message };
    }
    console.error('Unexpected error:', err);
    return { nodes: [], error: 'An unexpected error occurred' };
  }
}

// Computed once at module level — the DBML is a static constant
const { nodes: INITIAL_NODES, error: INITIAL_ERROR } = buildNodes();

export default function App(): ReactElement {
  if (INITIAL_ERROR) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#c00' }}>
        <strong>Error loading schema:</strong> {INITIAL_ERROR}
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
      <Scene nodes={INITIAL_NODES} />
    </div>
  );
}
