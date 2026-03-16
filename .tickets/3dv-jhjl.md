---
id: 3dv-jhjl
status: closed
deps: [3dv-o53s]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-20-field-defaults
tags: [feature, migration]
---

# Feature 20: Field Default Values in Table Cards

Back-populated from `features/20-field-defaults/`. This ticket tracks parsing DBML field defaults and displaying them in cards and hover details.

## Acceptance Criteria

- Parser extracts all supported DBML default types and normalizes them for rendering.
- Table cards show defaults in full and ref-fields-only modes, with truncation where needed.
- The navigation panel exposes the full untruncated default value with type context.
- Unit and integration tests cover default parsing and rendering.
