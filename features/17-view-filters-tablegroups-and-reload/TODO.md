# TODO — Feature 17: View Filters: TableGroups and Reload Current File

All task tracking is in **beads**. IDs below link each step to its bd issue.

---

## Task order and dependencies

```
T1 (FilterState type)
├── T2 (applyFilters intersection)
│   ├── T3 (ViewFiltersDialog UI) ──────┐
│   └── T7 (unit tests)                │
│                                      ▼
T5 (File System Access API)     T4 (wire boundaries)
└── T6 (Reload button)                 │
                                       ▼
                             T8 (Playwright E2E) ◄── T6
```

---

## Tasks

### T1 · `bd_3d-dbml-viewer-xu3` · Extend FilterState type
**Priority: high · Blocks: T2, T3, T4, T7**

Extend `src/types/index.ts` `FilterState` interface:
```ts
interface FilterState {
  fieldDetailMode: FieldDetailMode;
  visibleTableIds: Set<string>;
  visibleTableGroupIds: Set<string>;   // new — '__ungrouped__' sentinel for tables with no tableGroup
  showTableGroupBoundaries: boolean;   // new — default true when schema has TableGroups
}
```

Update `defaultFilterState()` in `src/parser/index.ts`:
- populate `visibleTableGroupIds` with all group IDs + `'__ungrouped__'` if any ungrouped tables exist
- set `showTableGroupBoundaries: true` when `schema.tableGroups` is non-empty, else `false`

Update `isFilterActive()` to detect divergence in both new fields.

- [ ] Extend `FilterState` interface
- [ ] Update `defaultFilterState`
- [ ] Update `isFilterActive`
- [ ] TypeScript strict-mode clean (`pnpm typecheck`)

---

### T2 · `bd_3d-dbml-viewer-sd1` · Update applyFilters (group × table intersection)
**Priority: high · Depends on: T1 · Blocks: T3, T7**

`src/parser/applyFilters.ts` — a table is included only when:
- its group (`tableGroup` or `'__ungrouped__'`) is in `visibleTableGroupIds`, **AND**
- its `id` is in `visibleTableIds`

Refs: both endpoint tables must pass the combined filter (no change to the ref logic itself, just let the table filter do the work).

- [ ] Implement intersection filter in `applyFilters`
- [ ] Handle `'__ungrouped__'` sentinel correctly
- [ ] Existing per-table filter behaviour unchanged

---

### T3 · `bd_3d-dbml-viewer-z4d` · Add TableGroups section to ViewFiltersDialog
**Priority: high · Depends on: T1, T2 · Blocks: T4, T8**

Extend `src/ui/ViewFiltersDialog.tsx`:

Dialog section order when `tableGroups` exist:
1. Field Detail *(existing)*
2. **Table Groups** *(new)*
3. Tables *(existing)*

**Table Groups section:**
- heading: *Table Groups*
- inline controls: *Select All* / *Unselect All*
- scrollable checkbox list (alphabetical); each row: checkbox + group name + `N tables` count
- synthetic *Ungrouped* row when any table has no `tableGroup`
- **Show TableGroup Boundaries** boolean toggle (checkbox or switch), placed above/below list

When schema has no `TableGroup`s: hide both section and toggle entirely.

Pass `tableGroups` and `allTables` as props; derive ungrouped entries inside the component.

- [ ] Conditionally render Table Groups section
- [ ] Group checkbox rows with Select All / Unselect All
- [ ] Ungrouped synthetic row
- [ ] Show TableGroup Boundaries toggle
- [ ] Section hidden for schemas without TableGroups (AT-1)
- [ ] Accessible: section labelled, all inputs have visible labels

---

### T4 · `bd_3d-dbml-viewer-n55` · Wire showTableGroupBoundaries through App → Scene
**Priority: high · Depends on: T1, T3 · Blocks: T8**

- Pass `filterState.showTableGroupBoundaries` as a prop to `Scene`
- In `Scene.tsx`, render `TableGroupBoundary` components only when the prop is `true`
- Boundaries for groups whose tables are all hidden should also not render (the group won't appear in `groupBoundaries` once `applyFilters` removes those tables — confirm during impl)
- Toggling boundaries must not affect table visibility, refs, layout, or hover state

- [ ] Add `showTableGroupBoundaries` prop to `Scene`
- [ ] Conditional `TableGroupBoundary` rendering
- [ ] Verify toggle has no side-effects on tables/refs/layout

---

### T5 · `bd_3d-dbml-viewer-aun` · Refactor LoadFileButton for File System Access API
**Priority: high · Blocks: T6**

Refactor `src/ui/LoadFileButton.tsx`:

- **Preferred path** (API available): call `window.showOpenFilePicker({ types: [{ accept: { 'text/plain': ['.dbml'] } }] })`, read the file, pass text to `onLoad`, pass the `FileSystemFileHandle` to a new `onHandleChange` callback
- **Fallback path** (API unavailable): existing `<input type="file">` flow; call `onHandleChange(null)`
- Detection: `typeof window.showOpenFilePicker === 'function'`
- Do **not** pretend to reload a stale `File` snapshot

Interface change:
```ts
interface LoadFileButtonProps {
  onLoad: (text: string) => void;
  onHandleChange: (handle: FileSystemFileHandle | null) => void;
}
```

- [ ] Detect API availability
- [ ] `showOpenFilePicker` preferred path
- [ ] `input[type=file]` fallback
- [ ] `onHandleChange` callback wired in `App.tsx`
- [ ] TypeScript types correct (may need `@types/wicg-file-system-access` or `lib.dom` augmentation)

---

### T6 · `bd_3d-dbml-viewer-vj4` · Add Reload button to toolbar
**Priority: high · Depends on: T5 · Blocks: T8**

Add a reload icon button immediately to the right of *Load file…* in `App.tsx`:

- Always rendered (not hidden when disabled)
- Enabled only when a `FileSystemFileHandle` is stored in state
- On click: `handle.getFile()` → read text → trigger same load flow as fresh load (including `setFilterState(defaultFilterState(parsed))`)
- On error: show existing error banner, preserve prior scene
- Accessible name: `Reload current file`
- Disabled tooltip/description: *Reload is available only for files opened with persistent file access*

- [ ] Store `fileHandle: FileSystemFileHandle | null` in `App` state
- [ ] Reload button component or inline JSX
- [ ] Enabled/disabled state wired to handle availability
- [ ] Reload flow: getFile → parse → setSchema + setFilterState reset
- [ ] Error handling: banner shown, prior scene kept
- [ ] Accessible label and disabled description

---

### T7 · `bd_3d-dbml-viewer-9a6` · Unit tests for extended filter logic
**Priority: medium · Depends on: T1, T2**

Add/extend unit tests in `tests/unit/parser/`:

- `defaultFilterState` with and without `TableGroup`s
- `isFilterActive` detects group and boundary changes
- `applyFilters` intersection: group hidden → table hidden; per-table hidden survives group toggle; ungrouped sentinel; refs filtered

Use `it.each` for data-driven cases.

- [ ] `defaultFilterState` tests
- [ ] `isFilterActive` tests for new fields
- [ ] `applyFilters` group × table intersection tests
- [ ] `pnpm test:run` passes, coverage ≥ 80 % on modified parser files

---

### T8 · `bd_3d-dbml-viewer-sh7` · Playwright E2E tests (AT-1 through AT-10)
**Priority: medium · Depends on: T3, T4, T6**

Add Playwright tests in `tests/visual/` covering all PRD acceptance tests:

| AT | Scenario |
|----|----------|
| AT-1 | No group section for ungrouped schema; section appears for grouped schema |
| AT-2 | Hide group → all its tables disappear |
| AT-3 | Refs to hidden-group tables disappear |
| AT-4 | Ungrouped filter hides only ungrouped tables |
| AT-5 | Boundary toggle hides/restores group boxes |
| AT-6 | Per-table hidden table stays hidden after group re-enable |
| AT-7 | Reload button disabled for default schema, enabled after file load |
| AT-8 | Reload reflects on-disk changes (write temp file, modify, reload) |
| AT-9 | Reload resets filters to default |
| AT-10 | Reload failure shows error banner, preserves prior scene |

Add a grouped DBML fixture to `tests/fixtures/` if one does not exist.

- [ ] Grouped schema fixture in `tests/fixtures/`
- [ ] AT-1 through AT-6 (filter dialog tests)
- [ ] AT-7 through AT-10 (reload tests)
- [ ] `pnpm test:e2e` passes with no console errors

---

## Definition of Done

- All 8 beads tasks closed
- `pnpm lint && pnpm typecheck && pnpm test:run && pnpm test:e2e` all pass
- No `eslint-disable` comments, no `@ts-ignore`
- `PROJECT_OVERVIEW.md` updated if architecture changed

When all tasks are complete the agent should output <promise>DONE</promise>
