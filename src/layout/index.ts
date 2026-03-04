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
import type { ParsedSchema, LayoutNode } from '@/types';

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string;
  target: string;
}

export function computeLayout(schema: ParsedSchema): LayoutNode[] {
  const n = schema.tables.length;

  // Deterministic initial positions — evenly spaced on a unit sphere
  const nodes: SimNode[] = schema.tables.map((table, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2;
    return {
      id: table.id,
      name: table.name,
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    };
  });

  const links: SimLink[] = schema.refs.map((ref) => ({
    source: ref.sourceId,
    target: ref.targetId,
  }));

  const simulation = forceSimulation(nodes, 3)
    .force('charge', forceManyBody().strength(-15))
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(3),
    )
    .force('cx', forceX(0).strength(0.1))
    .force('cy', forceY(0).strength(0.1))
    .force('cz', forceZ(0).strength(0.1))
    .stop();

  // Tick to completion
  for (let i = 0; i < 300 && simulation.alpha() > 0.001; i++) {
    simulation.tick();
  }

  // Normalize positions so the bounding sphere radius is TARGET_RADIUS world units.
  // This keeps the scene at a predictable scale regardless of force parameters.
  const TARGET_RADIUS = 3;
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
  const maxDist = Math.max(
    ...nodes.map((n) => Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2 + (n.z - cz) ** 2)),
  );
  const scale = maxDist > 0 ? TARGET_RADIUS / maxDist : 1;

  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    x: (node.x - cx) * scale,
    y: (node.y - cy) * scale,
    z: (node.z - cz) * scale,
  }));
}
