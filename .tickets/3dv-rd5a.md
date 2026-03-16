---
id: 3dv-rd5a
status: closed
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

## Notes

**2026-03-16T13:09:12Z**

Verified TableCard already combined distance opacity with hop-based opacity via min() and smooth lerping. Extracted shared hop opacity math into src/renderer/hopOpacity.ts and added unit coverage in tests/unit/hopOpacity.test.ts; validated related Scene and simulation plumbing with pnpm test:run tests/unit/hopOpacity.test.ts tests/unit/Scene.test.tsx tests/unit/useForceSimulation.test.ts on 2026-03-16.
