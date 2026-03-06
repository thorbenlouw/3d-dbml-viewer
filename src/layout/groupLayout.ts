import type { ParsedSchema, TableGroupBoundingBox, TableGroupDescriptor } from '@/types';

const DEFAULT_PADDING = 0.5;
const GROUP_SPACING_MARGIN = 1.5;
const CARD_SPACING = 0.8;
// Default card size estimate used when no external dimensions are provided
const DEFAULT_CARD_WIDTH = 2.8;
const DEFAULT_CARD_HEIGHT = 2.0;
const DEFAULT_CARD_DEPTH = 0.14;

export interface CardDimensions {
  width: number;
  height: number;
  depth: number;
}

/**
 * Build group descriptors from a parsed schema.
 * `cardDimensions` maps tableId -> {width, height, depth} from the renderer.
 * When a table is not found in the map, default estimates are used.
 */
export function buildGroupDescriptors(
  schema: ParsedSchema,
  cardDimensions: ReadonlyMap<string, CardDimensions> = new Map(),
  padding = DEFAULT_PADDING,
): TableGroupDescriptor[] {
  const groupMap = new Map<string, string[]>();
  for (const table of schema.tables) {
    if (table.tableGroup) {
      const members = groupMap.get(table.tableGroup) ?? [];
      members.push(table.id);
      groupMap.set(table.tableGroup, members);
    }
  }

  const descriptors: TableGroupDescriptor[] = [];
  for (const [groupName, tableIds] of groupMap) {
    const dims = tableIds.map(
      (id) =>
        cardDimensions.get(id) ?? {
          width: DEFAULT_CARD_WIDTH,
          height: DEFAULT_CARD_HEIGHT,
          depth: DEFAULT_CARD_DEPTH,
        },
    );

    const cols = Math.ceil(Math.sqrt(tableIds.length));
    const rows = Math.ceil(tableIds.length / cols);

    const maxW = Math.max(...dims.map((d) => d.width));
    const maxH = Math.max(...dims.map((d) => d.height));
    const maxD = Math.max(...dims.map((d) => d.depth));

    descriptors.push({
      id: groupName,
      name: groupName,
      tableIds,
      halfWidth: cols * (maxW + CARD_SPACING) * 0.5 + padding,
      halfHeight: rows * (maxH + CARD_SPACING) * 0.5 + padding,
      halfDepth: maxD * 0.5 + padding,
    });
  }

  // Deterministic ordering
  descriptors.sort((a, b) => a.id.localeCompare(b.id));
  return descriptors;
}

/**
 * Place groups in world space such that their bounding boxes do not intersect.
 * Returns a map of groupId -> world-space center.
 * Groups are arranged in a row along the X axis, centred around the origin.
 */
export function placeGroups(
  descriptors: TableGroupDescriptor[],
  spacingMargin = GROUP_SPACING_MARGIN,
): Map<string, { x: number; y: number; z: number }> {
  const centers = new Map<string, { x: number; y: number; z: number }>();
  if (descriptors.length === 0) return centers;

  // Arrange along X axis; deterministic order already established by buildGroupDescriptors
  let cursor = 0;
  const placements: Array<{ id: string; x: number }> = [];
  for (const desc of descriptors) {
    placements.push({ id: desc.id, x: cursor + desc.halfWidth });
    cursor += desc.halfWidth * 2 + spacingMargin;
  }

  // Centre around origin
  const totalWidth = cursor - spacingMargin;
  const offset = -totalWidth * 0.5;
  for (const p of placements) {
    centers.set(p.id, { x: p.x + offset, y: 0, z: 0 });
  }
  return centers;
}

/**
 * Compute initial seed positions for each table, placing them near their
 * group's world-space center using a Fibonacci sphere distribution.
 * Ungrouped tables are seeded near the origin.
 */
export function computeGroupSeedPositions(
  schema: ParsedSchema,
  groupCenters: ReadonlyMap<string, { x: number; y: number; z: number }>,
  seedRadius = 1.2,
): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>();

  // Group members → seed within small sphere around group center
  const groupIndexMap = new Map<string, number>();
  for (const table of schema.tables) {
    if (!table.tableGroup) continue;
    const center = groupCenters.get(table.tableGroup);
    if (!center) continue;

    const members = schema.tables.filter((t) => t.tableGroup === table.tableGroup);
    const n = members.length;
    const i = groupIndexMap.get(table.tableGroup) ?? 0;
    groupIndexMap.set(table.tableGroup, i + 1);

    const phi = n > 1 ? Math.acos(1 - (2 * (i + 0.5)) / n) : Math.PI / 2;
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    positions.set(table.id, {
      x: center.x + seedRadius * Math.sin(phi) * Math.cos(theta),
      y: center.y + seedRadius * Math.sin(phi) * Math.sin(theta),
      z: center.z + seedRadius * Math.cos(phi),
    });
  }

  // Ungrouped tables → seed near origin
  const ungrouped = schema.tables.filter((t) => !t.tableGroup);
  const n = ungrouped.length;
  ungrouped.forEach((table, i) => {
    const phi = n > 1 ? Math.acos(1 - (2 * (i + 0.5)) / n) : Math.PI / 2;
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 0.6;
    positions.set(table.id, {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    });
  });

  return positions;
}

/**
 * Compute world-space bounding boxes for all groups from the live node positions.
 * `cardDimensions` should map tableId -> {width, height, depth}.
 */
export function computeGroupBoundaries(
  schema: ParsedSchema,
  nodes: ReadonlyArray<{ id: string; x: number; y: number; z: number }>,
  cardDimensions: ReadonlyMap<string, CardDimensions>,
  padding = DEFAULT_PADDING,
): TableGroupBoundingBox[] {
  const groupMap = new Map<string, string[]>();
  for (const table of schema.tables) {
    if (table.tableGroup) {
      const members = groupMap.get(table.tableGroup) ?? [];
      members.push(table.id);
      groupMap.set(table.tableGroup, members);
    }
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const boundaries: TableGroupBoundingBox[] = [];
  for (const [groupName, tableIds] of groupMap) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const tableId of tableIds) {
      const node = nodeById.get(tableId);
      if (!node) continue;
      const dims = cardDimensions.get(tableId) ?? {
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
        depth: DEFAULT_CARD_DEPTH,
      };
      minX = Math.min(minX, node.x - dims.width * 0.5);
      maxX = Math.max(maxX, node.x + dims.width * 0.5);
      minY = Math.min(minY, node.y - dims.height * 0.5);
      maxY = Math.max(maxY, node.y + dims.height * 0.5);
      minZ = Math.min(minZ, node.z);
      maxZ = Math.max(maxZ, node.z + dims.depth);
    }

    if (!isFinite(minX)) continue;

    boundaries.push({
      groupId: groupName,
      groupName,
      centerX: (minX + maxX) * 0.5,
      centerY: (minY + maxY) * 0.5,
      centerZ: (minZ + maxZ) * 0.5,
      width: Math.max(maxX - minX + padding * 2, 1),
      height: Math.max(maxY - minY + padding * 2, 1),
      depth: Math.max(maxZ - minZ + padding * 2, 0.5),
    });
  }

  // Deterministic ordering
  boundaries.sort((a, b) => a.groupId.localeCompare(b.groupId));
  return boundaries;
}
