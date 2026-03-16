/**
 * Computes BFS hop distances from a starting table to all tables in the graph.
 *
 * @param startId     - The table ID to start from (hop distance 0).
 * @param neighbourMap - Adjacency map: tableId → array of directly connected tableIds.
 *                       All table IDs in the graph (including isolated ones) should be
 *                       present as keys (with an empty array if they have no connections).
 * @returns Map of tableId → hop distance. Unreachable tables are included with
 *          value Infinity.
 */
export function computeHopDistances(
  startId: string,
  neighbourMap: Map<string, string[]>,
): Map<string, number> {
  const distances = new Map<string, number>();

  // Initialise every known node to Infinity so disconnected nodes are included.
  for (const id of neighbourMap.keys()) {
    distances.set(id, Infinity);
  }
  // Ensure the start node is always present even if missing from the map.
  distances.set(startId, 0);

  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    const neighbours = neighbourMap.get(current) ?? [];

    for (const neighbour of neighbours) {
      if (distances.get(neighbour) === Infinity) {
        distances.set(neighbour, currentDist + 1);
        queue.push(neighbour);
      }
    }
  }

  return distances;
}
