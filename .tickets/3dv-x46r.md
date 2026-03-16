---
id: 3dv-x46r
status: open
deps: [3dv-n7oj]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: scene wiring for hop distances

Update src/renderer/Scene.tsx to pass hopDistance props to each TableCard and endpoint hop distances to RelationshipLink3D when sticky mode is active.

## Acceptance Criteria

Scene wiring supplies per-table and per-link hop-distance inputs needed for hop-based transparency, and passes null when no table is sticky.
