---
id: 3dv-bdrf
status: open
deps: []
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: BFS utility for hop distances

Create src/layout/hopDistance.ts with a pure computeHopDistances(startId, neighbourMap) BFS utility that returns hop counts for reachable tables and Infinity for disconnected tables.

## Acceptance Criteria

A new pure BFS utility exists at src/layout/hopDistance.ts and returns expected hop counts, including Infinity for disconnected nodes.
