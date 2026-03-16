---
id: 3dv-qndb
status: closed
deps: [3dv-g7rs]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-03-field-and-table-notes
tags: [feature, migration]
---

# Feature 03: Field and Table Notes

Back-populated from `features/03-field-and-table-notes/`. This ticket tracks extraction and presentation of DBML notes for tables and fields.

## Acceptance Criteria

- Parser preserves table- and field-level DBML notes as typed metadata.
- Table cards show note affordances only where note data exists.
- Opening a note shows the note panel and connector/highlight behavior without cluttering the scene by default.
- Fixtures, unit tests, and captured screenshots cover the note workflows.
