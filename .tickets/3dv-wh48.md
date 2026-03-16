---
id: 3dv-wh48
status: closed
deps: [3dv-citj]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-12-tablegroups
tags: [feature, migration]
---

# Feature 12: TableGroups

Back-populated from `features/12-tablegroups/`. This ticket tracks parsing, layout, and rendering support for DBML `TableGroup`s and their boundaries.

## Acceptance Criteria

- Parser output includes table-group metadata and table membership.
- Layout/rendering account for table groups and boundary boxes.
- Tests and screenshots cover grouped schemas and boundary rendering.
- The grouped-scene implementation feeds later filter/group workflows.
