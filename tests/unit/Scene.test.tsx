import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ParsedSchema, SimulationNode, TableCardNode } from '@/types';

const useForceSimulationMock = vi.hoisted(() =>
  vi.fn<
    (
      schema: ParsedSchema,
      options?: { stickyTableId?: string | null },
    ) => {
      nodes: SimulationNode[];
      hopDistances: Map<string, number> | null;
      setPin: () => void;
      nudge: () => void;
    }
  >(),
);

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { clone: () => ({ sub: () => ({ normalize: () => ({}) }) }) } },
    scene: {},
    gl: {
      domElement: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        clientWidth: 100,
        clientHeight: 100,
      },
    },
  }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: function OrbitControlsMock(): ReactElement {
    return <div data-testid="orbit-controls" />;
  },
}));

vi.mock('@/layout/useForceSimulation', () => ({
  useForceSimulation: useForceSimulationMock,
}));

vi.mock('@/layout', () => ({
  computeGroupBoundaries: vi.fn(() => []),
}));

vi.mock('@/renderer/TableCard', () => ({
  default: function TableCardMock(props: {
    node: TableCardNode;
    hopDistance?: number | null;
    onHeaderDoubleClick?: (tableId: string) => void;
  }): ReactElement {
    return (
      <button
        type="button"
        data-testid={`table-card-${props.node.id}`}
        data-hop-distance={String(props.hopDistance ?? null)}
        onClick={() => props.onHeaderDoubleClick?.(props.node.id)}
      >
        {props.node.id}
      </button>
    );
  },
}));

vi.mock('@/renderer/RelationshipLink3D', () => ({
  default: function RelationshipLink3DMock(props: {
    sourceNode: TableCardNode;
    targetNode: TableCardNode;
    sourceHopDistance?: number | null;
    targetHopDistance?: number | null;
  }): ReactElement {
    return (
      <div
        data-testid={`link-${props.sourceNode.id}-${props.targetNode.id}`}
        data-source-hop-distance={String(props.sourceHopDistance ?? null)}
        data-target-hop-distance={String(props.targetHopDistance ?? null)}
      />
    );
  },
}));

vi.mock('@/renderer/NavigationPanel', () => ({
  default: function NavigationPanelMock(): ReactElement | null {
    return null;
  },
}));

vi.mock('@/renderer/FocusMarker', () => ({
  default: function FocusMarkerMock(): ReactElement | null {
    return null;
  },
}));

vi.mock('@/renderer/TableGroupBoundary', () => ({
  default: function TableGroupBoundaryMock(): ReactElement | null {
    return null;
  },
}));

vi.mock('@/renderer/ProjectNotesCard', () => ({
  default: function ProjectNotesCardMock(): ReactElement | null {
    return null;
  },
}));

vi.mock('@/renderer/interaction', async () => {
  const actual =
    await vi.importActual<typeof import('@/renderer/interaction')>('@/renderer/interaction');
  return {
    ...actual,
    resolveMarkerPlacementPosition: vi.fn(() => null),
  };
});

import Scene from '@/renderer/Scene';

const schema: ParsedSchema = {
  tables: [
    { id: 't1', name: 'users', columns: [], note: undefined },
    { id: 't2', name: 'orders', columns: [], note: undefined },
    { id: 't3', name: 'products', columns: [], note: undefined },
  ],
  refs: [
    {
      id: 'r1',
      sourceId: 't1',
      targetId: 't2',
      sourceFieldNames: ['id'],
      targetFieldNames: ['user_id'],
    },
    {
      id: 'r2',
      sourceId: 't2',
      targetId: 't3',
      sourceFieldNames: ['product_id'],
      targetFieldNames: ['id'],
    },
  ],
};

const simNodes: SimulationNode[] = [
  { id: 't1', name: 'users', x: 0, y: 0, z: 0, fx: null, fy: null, fz: null, isPinned: false },
  { id: 't2', name: 'orders', x: 1, y: 0, z: 0, fx: null, fy: null, fz: null, isPinned: false },
  {
    id: 't3',
    name: 'products',
    x: 2,
    y: 0,
    z: 0,
    fx: null,
    fy: null,
    fz: null,
    isPinned: false,
  },
];

describe('Scene', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    }) as HTMLCanvasElement['getContext']);

    useForceSimulationMock.mockImplementation(
      (_schema, options?: { stickyTableId?: string | null }) => {
        const stickyTableId = options?.stickyTableId ?? null;
        const hopDistances =
          stickyTableId === 't1'
            ? new Map<string, number>([
                ['t1', 0],
                ['t2', 1],
                ['t3', 2],
              ])
            : null;

        return {
          nodes: simNodes,
          hopDistances,
          setPin: () => undefined,
          nudge: () => undefined,
        };
      },
    );
  });

  it('passes null hop distances when no table is sticky and hop distances when sticky mode activates', async () => {
    render(<Scene schema={schema} />);

    expect(screen.getByTestId('table-card-t1')).toHaveAttribute('data-hop-distance', 'null');
    expect(screen.getByTestId('table-card-t2')).toHaveAttribute('data-hop-distance', 'null');
    expect(screen.getByTestId('table-card-t3')).toHaveAttribute('data-hop-distance', 'null');
    expect(screen.getByTestId('link-t1-t2')).toHaveAttribute('data-source-hop-distance', 'null');
    expect(screen.getByTestId('link-t1-t2')).toHaveAttribute('data-target-hop-distance', 'null');

    fireEvent.click(screen.getByTestId('table-card-t1'));

    await waitFor(() => {
      expect(screen.getByTestId('table-card-t1')).toHaveAttribute('data-hop-distance', '0');
      expect(screen.getByTestId('table-card-t2')).toHaveAttribute('data-hop-distance', '1');
      expect(screen.getByTestId('table-card-t3')).toHaveAttribute('data-hop-distance', '2');
      expect(screen.getByTestId('link-t1-t2')).toHaveAttribute('data-source-hop-distance', '0');
      expect(screen.getByTestId('link-t1-t2')).toHaveAttribute('data-target-hop-distance', '1');
      expect(screen.getByTestId('link-t2-t3')).toHaveAttribute('data-source-hop-distance', '1');
      expect(screen.getByTestId('link-t2-t3')).toHaveAttribute('data-target-hop-distance', '2');
    });
  });
});
