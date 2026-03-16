---
id: 3dv-yyzs
status: closed
deps: [3dv-k5ma]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-14-project-notes-panel
tags: [feature, migration]
---

# Feature 14: Project Notes Panel

Back-populated from `features/14-project-notes-panel/`. This ticket tracks extraction and safe rendering of project-level DBML notes in a dedicated panel.

## Acceptance Criteria

- Parser extracts `Project` note content and treats empty notes as absent.
- Project notes render as sanitized markdown with bounded layout and minimize/expand behavior.
- Unsafe markdown does not execute, and tests cover sanitization behavior.
- Unit/integration tests and fixture coverage exist for note-present and note-absent schemas.
