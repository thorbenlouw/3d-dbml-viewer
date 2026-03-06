# PRD: TableGroups Hierarchical Layout and Rendering

## Problem

The current layout treats every table as a flat set of peers in one force
simulation. DBML `TableGroup`s are not represented visually, so users cannot
quickly see logical module boundaries in medium or large schemas.

Without visible group boundaries:

- Related tables are harder to scan as a cohesive unit.
- Large diagrams become visually noisy and cognitively expensive.
- Cross-domain references are hard to reason about because domain boundaries are
  implicit.

## Goal

Render tables that belong to the same DBML `TableGroup` inside a shared,
very-transparent 3D group boundary, and enforce non-intersection between group
boundaries while still allowing references across groups.

## Design Direction

Use translucent axis-aligned bounding boxes (AABB) in v1, not spheres.

Rationale:

- Boxes communicate "contained collection of cards" more clearly.
- Box containment and non-overlap checks are straightforward and deterministic.
- Labeling and future interactions (hover/select/focus group) are easier on
  boxes than spheres.

Future extension: optional rounded/convex/spherical group hull styles can be
added later as a purely visual variant.

## Goals

1. Parse and retain DBML `TableGroup` membership from source DBML.
2. Render one translucent boundary per non-empty table group.
3. Keep table cards inside their owning group boundary.
4. Ensure group boundaries do not intersect.
5. Keep references fully global, including cross-group references.
6. Preserve existing interaction behavior (hover, selection, camera, links).

## Non-Goals

- Editing table groups in-app.
- Persisting manual group positions between sessions.
- Perfectly minimizing edge crossings across groups.
- Introducing new group-level UI controls beyond boundary rendering.

## Success Criteria

| #   | Criterion                                                                  |
| --- | -------------------------------------------------------------------------- |
| 1   | Tables in the same DBML `TableGroup` are rendered within one boundary.     |
| 2   | Group boundaries are visibly distinct yet low-opacity and non-distracting. |
| 3   | Group boundaries do not intersect in tested scenarios.                     |
| 4   | Ungrouped tables still render correctly and remain readable.               |
| 5   | Cross-group references render and update as before.                        |
| 6   | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.                   |
| 7   | Headed visual verification confirms visible grouped 3D content.            |

## Scope

### In Scope

- DBML parsing pipeline updates to expose tablegroup membership.
- Layout updates to support hierarchical placement:
  - group-level non-overlapping placement
  - intra-group table placement
- Renderer updates for translucent 3D group boundaries.
- Tests covering parser mapping, hierarchical layout constraints, and renderer
  structure/behavior.

### Out of Scope

- New DBML syntax support beyond existing parser capabilities.
- Major redesign of link routing (straight lines remain acceptable in v1).
- Physics-based soft-body group hull deformation.

## User Experience Rules

1. Group boundaries are subtle: low opacity, thin line/edge treatment, no heavy
   occlusion of tables.
2. Each boundary includes the group name in a legible position.
3. Boundary size includes table content plus configurable padding.
4. Tables must remain visually inside the boundary in steady state.
5. Camera fit/reset behavior includes group boundaries in extents.

## Technical Approach

### Data Model

- Extend parsed schema model with:
  - `tableGroups: Array<{ id/name, tableIds[] }>`
  - `tableId -> groupId` lookup
- Represent ungrouped tables as singleton pseudo-groups internally for layout
  consistency, while optionally hiding pseudo-group boundaries in rendering.

### Hierarchical Layout (v1 deterministic/stable)

1. Build group descriptors from parsed schema and table dimensions.
2. Compute each group boundary size from contained table count and card extents
   plus padding.
3. Run a group-level 3D layout pass where each group is a super-node with a
   non-overlap constraint based on boundary extents.
4. For each group, run intra-group table layout in local space and clamp/fit
   inside the group boundary.
5. Compose final world positions: `tableWorldPos = groupWorldPos + tableLocalPos`.

### Cross-Group References

- Keep existing reference generation unchanged logically.
- Source/target endpoints use final world positions, so cross-group lines span
  boundaries naturally.
- If required for readability, reduce cross-group link attraction strength in
  force settings without disabling the links.

### Rendering

- Add `TableGroupBoundary` renderer component in `src/renderer/`.
- Use a transparent box mesh (and optional wireframe/edge helper) per group.
- Keep draw order/material settings tuned so tables remain readable.

## Risks and Mitigations

1. Layout jitter from competing constraints.
   - Mitigation: staged solve (group pass then intra-group pass), minimal
     iterative re-heating.
2. Dense cross-group links pulling groups into overlap.
   - Mitigation: hard/semi-hard group non-overlap and capped attraction.
3. Very large groups crowding scene extents.
   - Mitigation: extent heuristic with min/max scaling and adaptive spacing.
4. Visual clutter from too many boundaries.
   - Mitigation: conservative opacity defaults and optional visibility toggle in
     later iteration.

## Acceptance Tests

| #   | Scenario                                       | Expected                                                             |
| --- | ---------------------------------------------- | -------------------------------------------------------------------- |
| 1   | DBML with two tablegroups                      | Two named boundaries render, each containing its tables              |
| 2   | DBML with ungrouped + grouped tables           | All tables render; grouped tables are bounded correctly              |
| 3   | Groups with cross-group references             | Cross-group links render between groups without breaking containment |
| 4   | Stress fixture with uneven group sizes         | Boundaries do not intersect at steady state                          |
| 5   | Camera reset/fit                               | View includes all tables and group boundaries                        |
| 6   | `pnpm lint && pnpm typecheck`                  | No errors                                                            |
| 7   | `pnpm test:run`                                | Unit/integration tests pass                                          |
| 8   | `pnpm test:e2e --headed` + screenshot evidence | Visible grouped 3D scene confirmed                                   |

## Rollout Plan

1. Parse and type changes for tablegroup membership.
2. Layout internals for hierarchical placement with non-intersecting groups.
3. Boundary rendering and labeling.
4. Tests and visual verification evidence.
