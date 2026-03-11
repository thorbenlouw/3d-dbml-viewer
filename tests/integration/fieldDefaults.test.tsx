import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { parseDatabaseSchema } from '@/parser';
import NavigationPanel from '@/renderer/NavigationPanel';
import TableCard from '@/renderer/TableCard';
import type { HoverContext, TableCardNode } from '@/types';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {
      quaternion: new THREE.Quaternion(),
      position: new THREE.Vector3(0, 0, 10),
    },
  }),
}));

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fieldDefaultsDbml = readFileSync(
  resolve(__dirname, '../fixtures/field-defaults.dbml'),
  'utf-8',
);

function makeNode(): TableCardNode {
  const schema = parseDatabaseSchema(fieldDefaultsDbml);
  const table = schema.tables.find((entry) => entry.name === 'field_defaults');
  if (!table) throw new Error('Expected field_defaults table in fixture');

  return {
    id: table.id,
    name: table.name,
    x: 0,
    y: 0,
    z: 0,
    fx: null,
    fy: null,
    fz: null,
    isPinned: false,
    table,
  };
}

afterEach(() => {
  cleanup();
});

describe('field defaults integration', () => {
  it('renders field defaults on table cards in full mode and truncates long expressions', () => {
    const node = makeNode();

    render(<TableCard node={node} fieldDetailMode="full" />);

    expect(screen.getByText('= 42')).toBeInTheDocument();
    expect(screen.getByText("= 'pending'")).toBeInTheDocument();
    expect(screen.getByText('= true')).toBeInTheDocument();
    expect(screen.getByText('= `now()`')).toBeInTheDocument();
    expect(screen.getByText("= `sha256(concat_ws('…")).toBeInTheDocument();
  });

  it('shows defaults in ref-fields-only mode and hides field rows in table-only mode', () => {
    const node = makeNode();
    const referencedFieldNames = new Set(['status']);
    const { rerender } = render(
      <TableCard
        node={node}
        fieldDetailMode="ref-fields-only"
        referencedFieldNames={referencedFieldNames}
      />,
    );

    expect(screen.getByText("= 'pending'")).toBeInTheDocument();
    expect(screen.queryByText('= 42')).not.toBeInTheDocument();

    rerender(<TableCard node={node} fieldDetailMode="table-only" />);

    expect(screen.queryByText("= 'pending'")).not.toBeInTheDocument();
    expect(screen.queryByText('= 42')).not.toBeInTheDocument();
  });

  it('shows the full default value and type in the navigation panel', () => {
    const node = makeNode();
    const checksum = node.table.columns.find((column) => column.name === 'checksum');
    if (!checksum?.default) throw new Error('Expected checksum default in fixture');

    const hoverContext: HoverContext = {
      tableId: node.id,
      tableName: node.table.name,
      columnName: checksum.name,
      columnDefault: checksum.default,
    };

    render(<NavigationPanel hoverContext={hoverContext} references={null} />);

    expect(screen.getByTestId('navigation-default-value')).toHaveTextContent(
      "`sha256(concat_ws(':', tenant_id, user_id, created_at, status))` (expression)",
    );
  });
});
