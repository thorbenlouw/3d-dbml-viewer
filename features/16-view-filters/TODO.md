# TODO: View Filters

PRD: `features/16-view-filters/PRD.md`

## Tasks

### 1. Define `FilterState` type and derive filtered graph

In `src/types/` and `src/layout/`:

- Define `FieldDetailMode` enum/union: `'full' | 'ref-fields-only' | 'table-only'`
- Define `FilterState` type:
  - `mode: FieldDetailMode`
  - `visibleTableIds: Set<string>` (all table IDs = all visible by default)
- Write a pure `applyFilters(graph, filterState)` function that returns a
  derived graph containing only visible nodes and edges where both endpoints
  are visible.
- The derived graph must exclude hidden nodes from the force simulation
  (not just visually — removed from the node/link arrays entirely).
- Unit test: given a graph with 3 tables and 2 refs, hiding one table removes
  it and its edges from the derived graph.

---

### 2. Derive smart defaults from schema on file load

In the parser / schema-loading layer:

- After parsing, compute initial `FilterState`:
  - If `tableCount > 30` → `mode: 'table-only'`; else `mode: 'full'`
  - `visibleTableIds`: all table IDs in the schema
- Expose a `defaultFilterState(schema)` helper.
- Reset filter state whenever a new file is loaded (discard any prior state).
- Unit test: schema with 31 tables defaults to `table-only`; schema with 30
  defaults to `full`.

---

### 3. Add filter state to app-level state management

In the React app state (context or top-level hook):

- Add `filterState` and `setFilterState` alongside existing schema/graph state.
- Initialise from `defaultFilterState(schema)` when schema changes.
- Pass derived filtered graph to the renderer (not raw graph).

---

### 4. Adapt renderer to respect `FieldDetailMode`

In `src/renderer/` table node component(s):

- Accept a `mode: FieldDetailMode` prop (or from context).
- `full`: render all fields (existing behaviour).
- `ref-fields-only`: render only fields whose ID appears in the edge list of
  the **unfiltered** schema graph. Show table header always.
- `table-only`: render table header only, no field rows.
- Integration test: for each mode, assert the correct set of field rows is
  rendered for a fixture schema.

---

### 5. Build `ViewFiltersDialog` component

In `src/components/` (or `src/ui/`):

- Modal overlay with backdrop; centred on screen.
- **Section 1 — Field Detail**: segmented control / radio group for the three
  modes. Labels: "Full Table", "Ref Fields Only", "Table Only".
- **Section 2 — Tables**:
  - "Select All" and "Unselect All" buttons inline above the list.
  - Scrollable list (max-height with overflow-y: auto); handles 100+ tables.
  - Each row: checkbox + table name. Optional secondary text: field count.
  - Tables sorted alphabetically.
- Close: ✕ button top-right; pressing Escape also closes.
- Backdrop click does NOT close (prevents accidental dismissal).
- All changes apply live (call `setFilterState` on each interaction).
- Unit/integration test: toggling a checkbox calls `setFilterState` with
  updated `visibleTableIds`; mode change calls `setFilterState` with new mode.

---

### 6. Add "View Filters" toolbar button

In `src/components/Toolbar` (or equivalent):

- Add a "View Filters" button immediately to the right of the Load File
  control.
- Button opens `ViewFiltersDialog`.
- **Active-filter indicator**: when `filterState` differs from its defaults
  (any table hidden OR mode ≠ `'full'`), show a visual indicator on the button
  (e.g. a small accent-coloured dot or highlighted ring).
- Unit test: indicator is shown when filter state is non-default; hidden when
  default.

---

### 7. Wire everything together in `App` / top-level composition

- Ensure `ViewFiltersDialog` receives `filterState`, `setFilterState`, and the
  full (unfiltered) table list from the schema.
- Ensure the renderer receives the derived (filtered) graph and the
  `FieldDetailMode`.
- Verify no prop-drilling issues; use context if needed.
- Smoke test: load fixture, open dialog, change mode, close dialog — scene
  updates correctly.

---

### 8. Add unit tests

Under `tests/unit/`:

- `applyFilters`: hidden table removes node and both its edges.
- `applyFilters`: hidden table does not affect unrelated edges.
- `defaultFilterState`: ≤ 30 tables → `full`; > 30 tables → `table-only`; all
  tables visible in both cases.
- `isFilterActive`: returns true when mode ≠ default or any table hidden.

---

### 9. Add integration tests

Under `tests/integration/`:

- Rendering with `table-only` mode shows no field rows.
- Rendering with `ref-fields-only` mode shows only ref fields for a fixture
  with a mix of ref and non-ref fields.
- Hiding a table via `FilterState` removes it and its edges from rendered
  output.
- Select All restores all tables; Unselect All removes all.
- Loading a second schema resets filter state to new defaults.

---

### 10. Add E2E / visual tests

Under Playwright tests (`tests/visual/`):

- AT-1: small schema → dialog opens with Full Table selected, all checked.
- AT-2: large schema (> 30 tables) → dialog opens with Table Only selected.
- AT-3: switch to Table Only → node bodies disappear, edges remain.
- AT-4: switch to Ref Fields Only → non-ref fields disappear from a node.
- AT-6: uncheck a table → it disappears from the canvas.
- AT-7: edge between hidden and visible table disappears; other edges remain.
- AT-8: Unselect All empties canvas; Select All restores it.
- AT-9: active-filter indicator appears on toolbar button after hiding a table.
- AT-11: Escape key closes dialog.

---

### 11. Run quality gates and collect visual evidence

Run:

```bash
pnpm lint && pnpm typecheck
pnpm test:run
pnpm test:e2e --headed
```

Save headed screenshot evidence to:

- `test-evidence/view-filters-full-table.png`
- `test-evidence/view-filters-table-only.png`
- `test-evidence/view-filters-ref-fields-only.png`
- `test-evidence/view-filters-hidden-table.png`

---

### 12. Update documentation

- Update `PROJECT_OVERVIEW.md` to document the `FilterState` concept, the
  `applyFilters` pipeline step, and the new UI controls.

---

When all tasks are complete the agent should output <promise>DONE</promise>.
