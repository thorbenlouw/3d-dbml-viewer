import { useState, useEffect, useRef, useCallback } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceX,
  forceY,
  forceZ,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force-3d';
import type { ParsedSchema, SimulationNode } from '@/types';

interface D3Node extends SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  fx: number | null;
  fy: number | null;
  fz: number | null;
  isPinned: boolean;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  source: string;
  target: string;
}

function buildLiveNodes(tables: { id: string; name: string }[]): D3Node[] {
  const n = tables.length;
  return tables.map((table, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2;
    return {
      id: table.id,
      name: table.name,
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      fx: null,
      fy: null,
      fz: null,
      isPinned: false,
    };
  });
}

function toSimulationNode(n: D3Node): SimulationNode {
  return {
    id: n.id,
    name: n.name,
    x: n.x,
    y: n.y,
    z: n.z,
    fx: n.fx,
    fy: n.fy,
    fz: n.fz,
    isPinned: n.isPinned,
    vx: n.vx,
    vy: n.vy,
    vz: n.vz,
    index: n.index,
  };
}

export function useForceSimulation(schema: ParsedSchema): {
  nodes: SimulationNode[];
  setPin: (id: string, position: { x: number; y: number; z: number } | null) => void;
  nudge: (id: string, delta: { x: number; y: number; z: number }, neighbourFactor: number) => void;
} {
  const liveNodesRef = useRef<D3Node[]>([]);
  const nodeMapRef = useRef<Map<string, D3Node>>(new Map());
  const neighbourMapRef = useRef<Map<string, string[]>>(new Map());
  const draggingIdRef = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation> | null>(null);

  // Initialise with seeded positions so the first render has data immediately
  const [nodes, setNodes] = useState<SimulationNode[]>(() =>
    buildLiveNodes(schema.tables).map(toSimulationNode),
  );

  const flushState = useCallback(() => {
    setNodes(liveNodesRef.current.map(toSimulationNode));
  }, []);

  useEffect(() => {
    const liveNodes = buildLiveNodes(schema.tables);
    liveNodesRef.current = liveNodes;
    nodeMapRef.current = new Map(liveNodes.map((n) => [n.id, n]));

    // Build neighbour map keyed by both source and target for O(1) lookup
    const neighbourMap = new Map<string, string[]>();
    for (const ref of schema.refs) {
      const src = neighbourMap.get(ref.sourceId) ?? [];
      src.push(ref.targetId);
      neighbourMap.set(ref.sourceId, src);
      const tgt = neighbourMap.get(ref.targetId) ?? [];
      tgt.push(ref.sourceId);
      neighbourMap.set(ref.targetId, tgt);
    }
    neighbourMapRef.current = neighbourMap;

    const links: D3Link[] = schema.refs.map((ref) => ({
      source: ref.sourceId,
      target: ref.targetId,
    }));

    const sim = forceSimulation(liveNodes, 3)
      .force('charge', forceManyBody().strength(-15))
      .force(
        'link',
        forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(3),
      )
      .force('cx', forceX(0).strength(0.1))
      .force('cy', forceY(0).strength(0.1))
      .force('cz', forceZ(0).strength(0.1))
      .stop(); // Stop d3's internal timer; we drive ticks via rAF

    simRef.current = sim;

    let rafId: number;
    const tick = () => {
      const s = simRef.current;
      if (s && s.alpha() > s.alphaMin()) {
        s.tick();
      }
      setNodes(liveNodesRef.current.map(toSimulationNode));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      simRef.current = null;
    };
  }, [schema]);

  const setPin = useCallback(
    (id: string, position: { x: number; y: number; z: number } | null) => {
      const node = nodeMapRef.current.get(id);
      if (!node) return;

      if (position !== null) {
        node.x = position.x;
        node.y = position.y;
        node.z = position.z;
        node.fx = position.x;
        node.fy = position.y;
        node.fz = position.z;
        node.isPinned = true;
        draggingIdRef.current = id;
      } else {
        node.fx = null;
        node.fy = null;
        node.fz = null;
        node.isPinned = false;
        if (draggingIdRef.current === id) {
          draggingIdRef.current = null;
        }
      }

      simRef.current?.alpha(0.3);
      flushState();
    },
    [flushState],
  );

  const nudge = useCallback(
    (id: string, delta: { x: number; y: number; z: number }, neighbourFactor: number) => {
      const node = nodeMapRef.current.get(id);
      if (!node) return;

      node.x += delta.x;
      node.y += delta.y;
      node.z += delta.z;
      // Keep d3 fixed constraint in sync during drag
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;

      const neighbours = neighbourMapRef.current.get(id) ?? [];
      for (const neighbourId of neighbours) {
        if (neighbourId === draggingIdRef.current) continue;
        const neighbour = nodeMapRef.current.get(neighbourId);
        if (!neighbour || neighbour.isPinned) continue;
        neighbour.x += delta.x * neighbourFactor;
        neighbour.y += delta.y * neighbourFactor;
        neighbour.z += delta.z * neighbourFactor;
      }
      // rAF loop will pick up the changes on the next frame
    },
    [],
  );

  return { nodes, setPin, nudge };
}
