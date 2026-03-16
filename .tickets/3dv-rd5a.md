---
id: 3dv-rd5a
status: open
deps: [3dv-dfa7, 3dv-x46r]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: TableCard hop-based opacity

Extend src/renderer/TableCard.tsx so hop-based opacity is derived from the hopDistance prop, combined with camera-distance opacity using min(), and lerped smoothly during sticky mode transitions.

## Acceptance Criteria

TableCard opacity matches the feature PRD for hop levels and transitions smoothly when sticky mode activates or deactivates.
