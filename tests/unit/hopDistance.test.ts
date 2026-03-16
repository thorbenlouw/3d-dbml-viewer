import { describe, it, expect } from 'vitest';
import { computeHopDistances } from '@/layout/hopDistance';

function makeMap(entries: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(entries));
}

describe('computeHopDistances', () => {
  it('returns hop 0 for a single isolated table', () => {
    const map = makeMap({ A: [] });
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
  });

  it('returns hop 1 for direct neighbours', () => {
    const map = makeMap({ A: ['B', 'C'], B: [], C: [] });
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
    expect(result.get('B')).toBe(1);
    expect(result.get('C')).toBe(1);
  });

  it('returns hop 2 for a chain A→B→C starting from A', () => {
    const map = makeMap({ A: ['B'], B: ['C'], C: [] });
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
    expect(result.get('B')).toBe(1);
    expect(result.get('C')).toBe(2);
  });

  it('returns Infinity for disconnected tables', () => {
    const map = makeMap({ A: ['B'], B: [], C: [] }); // C is not connected
    const result = computeHopDistances('A', map);
    expect(result.get('C')).toBe(Infinity);
  });

  it('returns only the start node when the neighbour map is empty', () => {
    const result = computeHopDistances('A', new Map());
    expect(result.get('A')).toBe(0);
    expect(result.size).toBe(1);
  });

  it('handles cyclic graphs without infinite loops', () => {
    const map = makeMap({ A: ['B'], B: ['C'], C: ['A'] });
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
    expect(result.get('B')).toBe(1);
    expect(result.get('C')).toBe(2);
  });

  it('all direct neighbours in a large fan-out return hop 1', () => {
    const neighbours = Array.from({ length: 20 }, (_, i) => `N${i}`);
    const entries: Record<string, string[]> = { A: neighbours };
    for (const n of neighbours) entries[n] = [];
    const map = makeMap(entries);
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
    for (const n of neighbours) {
      expect(result.get(n)).toBe(1);
    }
  });

  it('counts bidirectional references correctly', () => {
    // Both A→B and B→A are present; BFS should find shortest paths
    const map = makeMap({ A: ['B'], B: ['A', 'C'], C: ['B'] });
    const result = computeHopDistances('A', map);
    expect(result.get('A')).toBe(0);
    expect(result.get('B')).toBe(1);
    expect(result.get('C')).toBe(2);
  });
});
