---
id: 3dv-9aac
status: closed
deps: [3dv-9755, 3dv-wh48]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-17-view-filters-tablegroups-and-reload
tags: [feature, migration]
---

# Feature 17: View Filters for TableGroups and Reload Current File

Back-populated from `features/17-view-filters-tablegroups-and-reload/`. This ticket tracks the extension of filtering to table groups plus disk-backed reload support.

## Acceptance Criteria

- Filter state includes visible table groups and group-boundary visibility, with correct defaulting and active-state detection.
- The View Filters dialog can toggle groups, ungrouped tables, and group-boundary visibility without breaking table-level filters.
- File System Access API support stores a reloadable handle and enables the Reload current file workflow with error handling and filter reset.
- Automated tests and screenshot evidence cover AT-1 through AT-10 for grouping and reload behavior.
