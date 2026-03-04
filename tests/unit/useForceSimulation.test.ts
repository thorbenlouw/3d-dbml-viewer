import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForceSimulation } from '@/layout/useForceSimulation';
import type { ParsedSchema } from '@/types';

// Mock requestAnimationFrame so we can control when rAF callbacks fire
let rafCallbacks: Array<(time: number) => void> = [];

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function flushRaf(): void {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb: (time: number) => void) => cb(0));
}

function runFrames(n: number): void {
  act(() => {
    for (let i = 0; i < n; i++) {
      flushRaf();
    }
  });
}

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

describe('useForceSimulation', () => {
  it('starts with nodes.length === schema.tables.length', () => {
    const { result } = renderHook(() => useForceSimulation(schema));
    expect(result.current.nodes).toHaveLength(schema.tables.length);
  });

  it('initial nodes have id and name from schema tables', () => {
    const { result } = renderHook(() => useForceSimulation(schema));
    const ids = result.current.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['t1', 't2', 't3']);
  });

  it('initial nodes have isPinned = false and fx/fy/fz = null', () => {
    const { result } = renderHook(() => useForceSimulation(schema));
    for (const node of result.current.nodes) {
      expect(node.isPinned).toBe(false);
      expect(node.fx).toBeNull();
      expect(node.fy).toBeNull();
      expect(node.fz).toBeNull();
    }
  });

  it('after setPin(id, pos), the node isPinned and position matches pos', () => {
    const { result } = renderHook(() => useForceSimulation(schema));
    const pos = { x: 5, y: 3, z: -2 };

    act(() => {
      result.current.setPin('t1', pos);
    });

    const node = result.current.nodes.find((n) => n.id === 't1');
    expect(node?.isPinned).toBe(true);
    expect(node?.x).toBeCloseTo(pos.x);
    expect(node?.y).toBeCloseTo(pos.y);
    expect(node?.z).toBeCloseTo(pos.z);
    expect(node?.fx).toBeCloseTo(pos.x);
    expect(node?.fy).toBeCloseTo(pos.y);
    expect(node?.fz).toBeCloseTo(pos.z);
  });

  it('after setPin(id, null), isPinned is false and fx/fy/fz are null', () => {
    const { result } = renderHook(() => useForceSimulation(schema));

    act(() => {
      result.current.setPin('t1', { x: 1, y: 2, z: 3 });
    });

    act(() => {
      result.current.setPin('t1', null);
    });

    const node = result.current.nodes.find((n) => n.id === 't1');
    expect(node?.isPinned).toBe(false);
    expect(node?.fx).toBeNull();
    expect(node?.fy).toBeNull();
    expect(node?.fz).toBeNull();
  });

  it('nudge moves the target node and its direct neighbours', () => {
    const { result } = renderHook(() => useForceSimulation(schema));

    // Pin ALL nodes at their current positions so the simulation doesn't move them.
    // We don't care about exact positions, just the delta from nudge.
    act(() => {
      for (const node of result.current.nodes) {
        result.current.setPin(node.id, { x: node.x, y: node.y, z: node.z });
      }
    });

    // Cool the simulation: with all nodes pinned the alpha still needs to drain.
    // alpha(0.3) decays with alphaDecay≈0.0228; need ~250 ticks to reach alphaMin≈0.001.
    runFrames(300);

    // Unpin t2 and t3 so nudge can move them; reheat is 0.3 each call.
    act(() => {
      result.current.setPin('t2', null);
      result.current.setPin('t3', null);
    });

    // Cool again after reheating from the two setPin(null) calls.
    runFrames(300);

    // Capture baseline positions with a cool simulation.
    const before = {
      t1: { ...result.current.nodes.find((n) => n.id === 't1')! },
      t2: { ...result.current.nodes.find((n) => n.id === 't2')! },
    };

    const delta = { x: 2, y: 1, z: 0.5 };
    const factor = 0.6;

    // Nudge t1; flush ONE rAF frame to push the live nodes into React state.
    // Because the simulation is cooled (alpha ≤ alphaMin) the tick branch is skipped.
    act(() => {
      result.current.nudge('t1', delta, factor);
      flushRaf();
    });

    const after = {
      t1: result.current.nodes.find((n) => n.id === 't1')!,
      t2: result.current.nodes.find((n) => n.id === 't2')!,
    };

    // t1 (pinned) should have moved by exactly delta
    expect(after.t1.x).toBeCloseTo(before.t1.x + delta.x, 4);
    expect(after.t1.y).toBeCloseTo(before.t1.y + delta.y, 4);
    expect(after.t1.z).toBeCloseTo(before.t1.z + delta.z, 4);

    // t2 is a direct neighbour of t1; should have moved by delta * factor
    expect(after.t2.x).toBeCloseTo(before.t2.x + delta.x * factor, 4);
    expect(after.t2.y).toBeCloseTo(before.t2.y + delta.y * factor, 4);
    expect(after.t2.z).toBeCloseTo(before.t2.z + delta.z * factor, 4);
  });

  it('nudge does not move pinned neighbours', () => {
    const { result } = renderHook(() => useForceSimulation(schema));

    // Pin both t1 (to drag) and t2 (to test that it doesn't move)
    act(() => {
      result.current.setPin('t1', { x: 0, y: 0, z: 0 });
      result.current.setPin('t2', { x: 5, y: 5, z: 5 });
    });

    const before = { ...result.current.nodes.find((n) => n.id === 't2')! };

    act(() => {
      result.current.nudge('t1', { x: 3, y: 3, z: 3 }, 0.6);
      flushRaf();
    });

    const after = result.current.nodes.find((n) => n.id === 't2')!;
    // t2 is pinned so it should NOT have moved
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(after.z).toBeCloseTo(before.z);
  });
});
