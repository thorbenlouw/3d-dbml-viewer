---
id: 3dv-t1pu
status: closed
deps: [3dv-cfpo]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-05-load-dbml-from-disk
tags: [feature, migration]
---

# Feature 05: Load DBML From Disk

Back-populated from `features/05-load-dbml-from-disk/`. This ticket tracks file loading so the viewer can render arbitrary DBML outside the hard-coded schema.

## Acceptance Criteria

- The UI can load DBML from disk and replace the current schema without a full reload.
- Parse failures surface through user-visible error handling rather than crashing the app.
- Tests cover file-loading flows and error paths.
- Visual evidence exists for the file-load workflow.
