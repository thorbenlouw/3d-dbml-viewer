---
id: 3dv-k5ma
status: closed
deps: [3dv-wh48]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-13-respect-dbml-color-styles
tags: [feature, migration]
---

# Feature 13: Respect DBML Color Styles

Back-populated from `features/13-respect-dbml-color-styles/`. This ticket tracks support for DBML color styling on tables, refs, and groups.

## Acceptance Criteria

- Parser extracts DBML color style metadata and resolves precedence correctly.
- Table cards, relationship links, and group boundaries render the resolved colors.
- Color utility tests and visual evidence cover the styling rules.
