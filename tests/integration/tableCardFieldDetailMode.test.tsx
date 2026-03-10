import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import TableCard from '@/renderer/TableCard';
import type { TableCardNode } from '@/types';

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

const NODE: TableCardNode = {
  id: 'posts',
  name: 'posts',
  x: 0,
  y: 0,
  z: 0,
  fx: null,
  fy: null,
  fz: null,
  isPinned: false,
  table: {
    id: 'posts',
    name: 'posts',
    columns: [
      {
        name: 'id',
        type: 'int',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
        isUnique: false,
      },
      {
        name: 'author_id',
        type: 'int',
        isPrimaryKey: false,
        isForeignKey: true,
        isNotNull: true,
        isUnique: false,
      },
      {
        name: 'title',
        type: 'varchar',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: true,
        isUnique: false,
      },
    ],
  },
};

afterEach(() => {
  cleanup();
});

describe('TableCard field detail modes', () => {
  it('renders all fields in full mode', () => {
    render(<TableCard node={NODE} fieldDetailMode="full" />);

    expect(screen.getByText('posts')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('author_id')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders only referenced fields in ref-fields-only mode', () => {
    render(
      <TableCard
        node={NODE}
        fieldDetailMode="ref-fields-only"
        referencedFieldNames={new Set(['id', 'author_id'])}
      />,
    );

    expect(screen.getByText('posts')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('author_id')).toBeInTheDocument();
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it('renders only the table header in table-only mode', () => {
    render(<TableCard node={NODE} fieldDetailMode="table-only" />);

    expect(screen.getByText('posts')).toBeInTheDocument();
    expect(screen.queryByText('id')).not.toBeInTheDocument();
    expect(screen.queryByText('author_id')).not.toBeInTheDocument();
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });
});
