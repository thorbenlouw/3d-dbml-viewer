# TODO: TableGroups Hierarchical Layout and Rendering

## Tasks

### 1. Add TableGroup support to schema types

In `src/types/index.ts` (and any parser-owned types):

- Introduce explicit types for table groups and table-to-group membership.
- Ensure exported layout input types can represent:
  - named groups with member table IDs
  - ungrouped tables
- Keep strict typing; avoid `any`.

---

### 2. Parse DBML tablegroup membership into the app schema model

In parser modules under `src/parser/`:

- Map DBML `TableGroup` definitions to application-level group structures.
- Build a stable lookup `tableId -> groupId`.
- Validate behavior when:
  - a table is in exactly one group
  - a table is in no group
- Add guards/errors for invalid or conflicting membership states as needed.

---

### 3. Add/extend fixtures for grouped schemas

In `tests/fixtures/`:

- Add at least one fixture with:
  - multiple groups
  - cross-group references
  - at least one ungrouped table
- Add a stress-style fixture with uneven group sizes for non-overlap checks.

Do not modify unrelated fixture files.

---

### 4. Implement group-level layout descriptors

In `src/layout/`:

- Build group descriptors from parsed schema and table card dimensions.
- Compute boundary extents with configurable padding.
- Represent ungrouped tables as singleton pseudo-groups for layout consistency
  (rendering visibility can be handled later).

---

### 5. Implement non-intersecting group placement

In `src/layout/`:

- Add a group-level placement pass (super-node layout).
- Enforce non-overlap using boundary extents + spacing margin.
- Return stable world-space group centers for downstream composition.

Add unit tests that assert no pairwise group-boundary intersection for core
fixtures.

---

### 6. Implement intra-group table placement

In `src/layout/`:

- Place tables within each group in local space.
- Ensure local positions fit within boundary extents (including padding).
- Compose final table world positions from group center + local offset.

Add tests covering containment and deterministic output properties.

---

### 7. Integrate hierarchical layout into renderer pipeline

In `src/renderer/Scene.tsx` (or relevant orchestration module):

- Replace or extend current flat layout consumption with hierarchical output.
- Keep existing table meshes, labels, and edge rendering behavior intact.
- Ensure cross-group references use final world coordinates.

---

### 8. Add `TableGroupBoundary` renderer component

In `src/renderer/`:

- Create `TableGroupBoundary.tsx` to render translucent 3D box boundaries.
- Render boundary label (group name) in a readable position.
- Use conservative material defaults (very transparent, low visual dominance).
- Ensure cleanup/disposal for Three.js resources on unmount.

---

### 9. Ensure camera fit/reset includes boundaries

In camera/scene bounds logic:

- Include group boundary extents in computed scene bounds.
- Validate that "reset view" keeps all groups and tables in view.

---

### 10. Add and update tests

Unit tests (`tests/unit/`):

- Parser mapping for tablegroups and table membership.
- Group extent calculation and non-intersection checks.
- Intra-group containment checks.

Integration tests (`tests/integration/`):

- DBML -> parsed schema -> hierarchical layout pipeline.
- Cross-group reference behavior preserved with grouped layout.

Visual/E2E (`tests/visual/` / Playwright):

- Assert canvas and key UI still load with grouped fixture.
- Run headed verification to confirm visible grouped 3D rendering.

---

### 11. Run validation and collect visual evidence

Run:

```bash
pnpm lint && pnpm typecheck
pnpm test:run
pnpm test:e2e --headed
```

Capture and save a headed screenshot showing visible group boundaries and tables:

- `test-evidence/tablegroups-hierarchical-layout.png`

---

### 12. Documentation updates

- Update `PROJECT_OVERVIEW.md` if architecture/layout pipeline changes are
  introduced.
- Add concise notes for new layout parameters and defaults where appropriate.

---

When all tasks are complete the agent should output <promise>DONE</promise>.
