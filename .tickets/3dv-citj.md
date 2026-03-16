---
id: 3dv-citj
status: closed
deps: [3dv-fsvp]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-11-referenced-by-in-details-panel
tags: [feature, migration]
---

# Feature 11: Referenced By in Details Panel

Back-populated from `features/11-referenced-by-in-details-panel/`. This ticket tracks surfacing reverse-reference information in the details/navigation panel.

## Acceptance Criteria

- The details panel includes reverse-reference information for the focused entity.
- Parser/renderer data flow supports the new details content without duplicating DBML parsing in the UI layer.
- Tests and visual evidence cover the referenced-by presentation.
