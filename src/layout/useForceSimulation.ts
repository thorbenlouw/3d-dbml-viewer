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
  type ManyBodyForce,
  type LinkForce,
} from 'd3-force-3d';
import type { ParsedSchema, SimulationNode } from '@/types';

const BASE_LINK_DISTANCE = 1.5;
const STICKY_LINK_DISTANCE_MULTIPLIER = 0.65;
const NON_STICKY_LINK_DISTANCE_MULTIPLIER = 1.12;
const STICKY_NEIGHBOUR_TARGET_RADIUS = 1.9;
const STICKY_NEIGHBOUR_PULL = 2.0;
const STICKY_PLANE_PULL = 1.7;
const STICKY_UNRELATED_MIN_DISTANCE = 4.6;
const STICKY_UNRELATED_PUSH = 1.15;
const BASE_CHARGE_STRENGTH = -15;

function computeChargeStrength(scale: number): number {
  // Much lower repulsion at small spacing values, stronger repulsion when spread out.
  return BASE_CHARGE_STRENGTH * (0.1 + scale * 1.1);
}

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

export interface ForceSimulationOptions {
  onSettled?: (nodes: SimulationNode[]) => void;
  stickyTableId?: string | null;
  linkDistanceScale?: number;
}

export function clampLinkDistanceScale(scale: number): number {
  return Math.min(2.4, Math.max(0.1, scale));
}

export function computeEffectiveLinkDistance(params: {
  scale: number;
  stickyTableId: string | null;
  sourceId: string;
  targetId: string;
}): number {
  const clampedScale = clampLinkDistanceScale(params.scale);
  const base = BASE_LINK_DISTANCE * clampedScale;

  if (!params.stickyTableId) return base;

  if (params.sourceId === params.stickyTableId || params.targetId === params.stickyTableId) {
    return base * STICKY_LINK_DISTANCE_MULTIPLIER;
  }

  return base * NON_STICKY_LINK_DISTANCE_MULTIPLIER;
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

function getNodeId(nodeOrId: string | number | D3Node): string {
  if (typeof nodeOrId === 'string') return nodeOrId;
  if (typeof nodeOrId === 'number') return String(nodeOrId);
  return nodeOrId.id;
}

function applyStickyFocusForces(params: {
  alpha: number;
  nodes: D3Node[];
  nodeMap: Map<string, D3Node>;
  neighbourMap: Map<string, string[]>;
  stickyTableId: string | null;
}): void {
  const { alpha, nodes, nodeMap, neighbourMap, stickyTableId } = params;
  if (!stickyTableId) return;

  const stickyNode = nodeMap.get(stickyTableId);
  if (!stickyNode) return;

  const neighbours = new Set(neighbourMap.get(stickyTableId) ?? []);

  for (const node of nodes) {
    if (node.id === stickyTableId || node.isPinned) continue;

    const dx = node.x - stickyNode.x;
    const dy = node.y - stickyNode.y;
    const dz = node.z - stickyNode.z;

    if (neighbours.has(node.id)) {
      const planarDistance = Math.max(0.0001, Math.hypot(dx, dy));
      const ux = dx / planarDistance;
      const uy = dy / planarDistance;
      const targetX = stickyNode.x + ux * STICKY_NEIGHBOUR_TARGET_RADIUS;
      const targetY = stickyNode.y + uy * STICKY_NEIGHBOUR_TARGET_RADIUS;

      node.vx = (node.vx ?? 0) + (targetX - node.x) * STICKY_NEIGHBOUR_PULL * alpha;
      node.vy = (node.vy ?? 0) + (targetY - node.y) * STICKY_NEIGHBOUR_PULL * alpha;
      node.vz = (node.vz ?? 0) + (stickyNode.z - node.z) * STICKY_PLANE_PULL * alpha;
      continue;
    }

    const distance = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy + dz * dz));
    if (distance >= STICKY_UNRELATED_MIN_DISTANCE) continue;

    const push =
      ((STICKY_UNRELATED_MIN_DISTANCE - distance) / STICKY_UNRELATED_MIN_DISTANCE) *
      STICKY_UNRELATED_PUSH *
      alpha;
    const ux = dx / distance;
    const uy = dy / distance;
    const uz = dz / distance;

    node.vx = (node.vx ?? 0) + ux * push;
    node.vy = (node.vy ?? 0) + uy * push;
    node.vz = (node.vz ?? 0) + uz * push * 0.6;
  }
}

export function useForceSimulation(
  schema: ParsedSchema,
  optionsOrOnSettled?: ForceSimulationOptions | ((nodes: SimulationNode[]) => void),
): {
  nodes: SimulationNode[];
  setPin: (id: string, position: { x: number; y: number; z: number } | null) => void;
  nudge: (id: string, delta: { x: number; y: number; z: number }, neighbourFactor: number) => void;
} {
  const liveNodesRef = useRef<D3Node[]>([]);
  const nodeMapRef = useRef<Map<string, D3Node>>(new Map());
  const neighbourMapRef = useRef<Map<string, string[]>>(new Map());
  const draggingIdRef = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const linkForceRef = useRef<LinkForce<D3Node, D3Link> | null>(null);
  const chargeForceRef = useRef<ManyBodyForce<D3Node> | null>(null);

  const normalizedOptions: ForceSimulationOptions =
    typeof optionsOrOnSettled === 'function'
      ? { onSettled: optionsOrOnSettled }
      : (optionsOrOnSettled ?? {});

  const onSettled = normalizedOptions.onSettled;
  const stickyTableId = normalizedOptions.stickyTableId ?? null;
  const linkDistanceScale = normalizedOptions.linkDistanceScale ?? 1;

  const stickyTableIdRef = useRef<string | null>(stickyTableId);
  const linkDistanceScaleRef = useRef<number>(clampLinkDistanceScale(linkDistanceScale));

  useEffect(() => {
    stickyTableIdRef.current = stickyTableId;
    linkDistanceScaleRef.current = clampLinkDistanceScale(linkDistanceScale);
  }, [stickyTableId, linkDistanceScale]);

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

    const resolveDistance = (linkDatum: D3Link): number => {
      const sourceId = getNodeId(linkDatum.source);
      const targetId = getNodeId(linkDatum.target);
      return computeEffectiveLinkDistance({
        scale: linkDistanceScaleRef.current,
        stickyTableId: stickyTableIdRef.current,
        sourceId,
        targetId,
      });
    };

    const linkForce = forceLink<D3Node, D3Link>(links)
      .id((d) => d.id)
      .distance(resolveDistance);

    const stickyForce = (alpha: number): void => {
      applyStickyFocusForces({
        alpha,
        nodes: liveNodesRef.current,
        nodeMap: nodeMapRef.current,
        neighbourMap: neighbourMapRef.current,
        stickyTableId: stickyTableIdRef.current,
      });
    };
    stickyForce.initialize = () => {
      // no-op, force operates on refs each tick
    };

    const chargeForce = forceManyBody<D3Node>().strength(() =>
      computeChargeStrength(linkDistanceScaleRef.current),
    );

    const sim = forceSimulation(liveNodes, 3)
      .force('charge', chargeForce)
      .force('link', linkForce)
      .force('sticky-focus', stickyForce)
      .force('cx', forceX(0).strength(0.1))
      .force('cy', forceY(0).strength(0.1))
      .force('cz', forceZ(0).strength(0.1))
      .stop(); // Stop d3's internal timer; we drive ticks via rAF

    simRef.current = sim;
    linkForceRef.current = linkForce;
    chargeForceRef.current = chargeForce;

    let hasSettled = false;
    let rafId: number;
    const tick = () => {
      const s = simRef.current;
      if (s && s.alpha() > s.alphaMin()) {
        s.tick();
        if (!hasSettled && s.alpha() < 0.05) {
          hasSettled = true;
          onSettled?.(liveNodesRef.current.map(toSimulationNode));
        }
      }
      setNodes(liveNodesRef.current.map(toSimulationNode));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      simRef.current = null;
      linkForceRef.current = null;
      chargeForceRef.current = null;
    };
  }, [schema, onSettled]);

  useEffect(() => {
    const linkForce = linkForceRef.current;
    const chargeForce = chargeForceRef.current;
    const sim = simRef.current;
    if (!linkForce || !chargeForce || !sim) return;

    linkForce.distance((linkDatum: D3Link) => {
      const sourceId = getNodeId(linkDatum.source);
      const targetId = getNodeId(linkDatum.target);
      return computeEffectiveLinkDistance({
        scale: linkDistanceScaleRef.current,
        stickyTableId: stickyTableIdRef.current,
        sourceId,
        targetId,
      });
    });
    chargeForce.strength(() => computeChargeStrength(linkDistanceScaleRef.current));

    sim.alpha(0.25);
  }, [stickyTableId, linkDistanceScale]);

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
