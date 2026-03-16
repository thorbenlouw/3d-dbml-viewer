---
id: 3dv-o53s
status: closed
deps: [3dv-o4w1]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-19-enum-rendering
tags: [feature, migration]
---

# Feature 19: Enum Rendering in Table Cards

Back-populated from `features/19-enum-rendering/`. This ticket tracks parsing DBML enums and surfacing them in cards and hover details.

## Acceptance Criteria

- Parser extracts enum declarations and resolves enum-typed fields to `enumValues`.
- Table cards show an enum indicator for enum-typed fields.
- Hover/details UI exposes enum values and optional notes without expanding cards inline.
- Unit and integration tests cover enum parsing and rendering behavior.
