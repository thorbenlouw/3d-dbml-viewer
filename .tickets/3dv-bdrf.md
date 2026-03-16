---
id: 3dv-bdrf
status: closed
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

## Notes

**2026-03-16T13:00:54Z**

Verified existing src/layout/hopDistance.ts implementation against Feature 21 PRD. Confirmed Infinity handling for disconnected nodes and passing coverage in tests/unit/hopDistance.test.ts via pnpm test:run on 2026-03-16.
