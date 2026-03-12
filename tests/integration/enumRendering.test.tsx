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

const enumRenderingDbml = readFileSync(
  resolve(__dirname, '../fixtures/enum-rendering.dbml'),
  'utf-8',
);

function makeNode(): TableCardNode {
  const schema = parseDatabaseSchema(enumRenderingDbml);
  const table = schema.tables.find((entry) => entry.name === 'orders');
  if (!table) throw new Error('Expected orders table in fixture');

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

describe('enum rendering integration', () => {
  it('renders an enum badge on enum-typed field rows', () => {
    const node = makeNode();

    render(<TableCard node={node} fieldDetailMode="full" />);

    expect(screen.getAllByText('E')).toHaveLength(3);
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
    expect(screen.getByText('audit_type')).toBeInTheDocument();
  });

  it('shows enum badges in ref-fields-only mode and hides field rows in table-only mode', () => {
    const node = makeNode();
    const { rerender } = render(
      <TableCard
        node={node}
        fieldDetailMode="ref-fields-only"
        referencedFieldNames={new Set(['status'])}
      />,
    );

    expect(screen.getAllByText('E')).toHaveLength(1);
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.queryByText('priority')).not.toBeInTheDocument();

    rerender(<TableCard node={node} fieldDetailMode="table-only" />);

    expect(screen.queryByText('E')).not.toBeInTheDocument();
    expect(screen.queryByText('status')).not.toBeInTheDocument();
  });

  it('shows enum values and notes in the navigation panel for the hovered field', () => {
    const node = makeNode();
    const status = node.table.columns.find((column) => column.name === 'status');
    if (!status?.enumValues) throw new Error('Expected enum values on status column');

    const hoverContext: HoverContext = {
      tableId: node.id,
      tableName: node.table.name,
      columnName: status.name,
      enumValues: status.enumValues,
    };

    render(<NavigationPanel hoverContext={hoverContext} references={null} />);

    expect(screen.getByTestId('navigation-enum-values')).toHaveTextContent('pending');
    expect(screen.getByTestId('navigation-enum-values')).toHaveTextContent(
      'Order received but not yet processed',
    );
    expect(screen.getByTestId('navigation-enum-values')).toHaveTextContent('confirmed');
    expect(screen.getByTestId('navigation-enum-values')).toHaveTextContent('shipped');
  });
});
