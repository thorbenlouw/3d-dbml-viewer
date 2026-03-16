---
id: 3dv-f7vg
status: closed
deps: [3dv-v0kf]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-01-initial-view-in-3d
tags: [feature, migration]
---

# Feature 01: Initial View in 3D

Back-populated from `features/01-initial-view-in-3d/`. This ticket tracks the first end-to-end 3D schema render from hard-coded DBML through parser, layout, and scene rendering.

## Acceptance Criteria

- Hard-coded DBML is parsed into typed tables/refs and laid out deterministically in 3D.
- The scene renders readable billboarded table nodes with distance-based opacity and a working Reset View control.
- Parser, layout, and pipeline tests cover the initial render path.
- Visual evidence exists for the startup scene and reset interaction.
