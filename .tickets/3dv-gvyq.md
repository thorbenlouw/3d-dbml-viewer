---
id: 3dv-gvyq
status: closed
deps: [3dv-bdrf]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: BFS unit tests

Add unit tests for computeHopDistances covering a single table, direct neighbours, multi-hop chains, disconnected tables, empty graphs, and cyclic graphs.

## Acceptance Criteria

tests/unit/layout/hopDistance.test.ts covers the BFS utility scenarios listed in the feature TODO and passes under pnpm test:run.

## Notes

**2026-03-16T13:04:41Z**

Verified computeHopDistances unit coverage already exists in tests/unit/hopDistance.test.ts, covering isolated node, direct neighbours, multi-hop chain, disconnected node Infinity, empty graph, cyclic graph, plus additional fan-out and bidirectional cases. Confirmed passing under pnpm test:run on 2026-03-16.
