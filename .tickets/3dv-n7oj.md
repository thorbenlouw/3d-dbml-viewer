---
id: 3dv-n7oj
status: closed
deps: [3dv-bdrf, 3dv-dfa7]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: simulation hop-distance integration

Update src/layout/useForceSimulation.ts to expose hop distances computed from neighbourMap when stickyTableId changes, and return null when sticky mode is inactive.

## Acceptance Criteria

The force simulation recomputes and exposes hop distances only when sticky focus changes and provides no hop map when sticky mode is off.

## Notes

**2026-03-16T13:05:35Z**

Verified useForceSimulation already exposes hopDistances and returns null when stickyTableId is inactive. Added direct unit coverage in tests/unit/useForceSimulation.test.ts for null inactive state and recomputation when stickyTableId changes; confirmed via pnpm test:run tests/unit/useForceSimulation.test.ts on 2026-03-16.
