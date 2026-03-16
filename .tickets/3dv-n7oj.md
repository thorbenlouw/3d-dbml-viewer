---
id: 3dv-n7oj
status: open
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
