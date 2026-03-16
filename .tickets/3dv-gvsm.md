---
id: 3dv-gvsm
status: open
deps: [3dv-dfa7, 3dv-x46r]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: relationship link hop-based opacity

Update src/renderer/RelationshipLink3D.tsx to accept hop distances for both endpoints and render link opacity from the more transparent endpoint, with smooth transitions instead of a fixed 0.8 opacity.

## Acceptance Criteria

Relationship links fade according to the more transparent endpoint table and transition smoothly in sticky mode.
