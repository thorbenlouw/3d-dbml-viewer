---
id: 3dv-gvsm
status: closed
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

## Notes

**2026-03-16T13:09:12Z**

Verified RelationshipLink3D already fades links using the more transparent endpoint and smooth lerping. Extracted shared hop opacity math into src/renderer/hopOpacity.ts and added unit coverage in tests/unit/hopOpacity.test.ts; validated link hop-distance inputs via tests/unit/Scene.test.tsx and targeted renderer tests on 2026-03-16.
