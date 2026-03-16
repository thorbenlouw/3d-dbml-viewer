---
id: 3dv-g7rs
status: closed
deps: [3dv-f7vg]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-02-render-table-fields-and-properties
tags: [feature, migration]
---

# Feature 02: Render Table Fields and Properties

Back-populated from `features/02-render-table-fields-and-properties/`. This ticket tracks the migration from simple boxes to table cards with field rows and routed relationship links.

## Acceptance Criteria

- Parser output includes field-level metadata required for table-card rendering.
- Table cards render headers, field names, types, and property badges in the 3D scene.
- Relationship links are rendered as deliberate routed 3D paths rather than flat straight lines.
- Integration and visual tests cover the pipeline and scene rendering.
