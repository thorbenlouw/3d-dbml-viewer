# TODO — Feature 17: View Filters: TableGroups and Reload Current File

Track these tasks in `tk`. IDs below are local task labels only.

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

### T1 · Extend FilterState type

**Priority: high · Blocks: T2, T3, T4, T7**

Extend `src/types/index.ts` `FilterState` interface:

```ts
interface FilterState {
  fieldDetailMode: FieldDetailMode;
  visibleTableIds: Set<string>;
  visibleTableGroupIds: Set<string>; // new — '__ungrouped__' sentinel for tables with no tableGroup
  showTableGroupBoundaries: boolean; // new — default true when schema has TableGroups
}
```

Update `defaultFilterState()` in `src/parser/index.ts`:

- populate `visibleTableGroupIds` with all group IDs + `'__ungrouped__'` if any ungrouped tables exist
- set `showTableGroupBoundaries: true` when `schema.tableGroups` is non-empty, else `false`

Update `isFilterActive()` to detect divergence in both new fields.

- [x] Extend `FilterState` interface
- [x] Update `defaultFilterState`
- [x] Update `isFilterActive`
- [x] TypeScript strict-mode clean (`pnpm typecheck`)

---

### T2 · Update applyFilters (group × table intersection)

**Priority: high · Depends on: T1 · Blocks: T3, T7**

`src/parser/applyFilters.ts` — a table is included only when:

- its group (`tableGroup` or `'__ungrouped__'`) is in `visibleTableGroupIds`, **AND**
- its `id` is in `visibleTableIds`

Refs: both endpoint tables must pass the combined filter (no change to the ref logic itself, just let the table filter do the work).

- [x] Implement intersection filter in `applyFilters`
- [x] Handle `'__ungrouped__'` sentinel correctly
- [x] Existing per-table filter behaviour unchanged

---

### T3 · Add TableGroups section to ViewFiltersDialog

**Priority: high · Depends on: T1, T2 · Blocks: T4, T8**

Extend `src/ui/ViewFiltersDialog.tsx`:

Dialog section order when `tableGroups` exist:

1. Field Detail _(existing)_
2. **Table Groups** _(new)_
3. Tables _(existing)_

**Table Groups section:**

- heading: _Table Groups_
- inline controls: _Select All_ / _Unselect All_
- scrollable checkbox list (alphabetical); each row: checkbox + group name + `N tables` count
- synthetic _Ungrouped_ row when any table has no `tableGroup`
- **Show TableGroup Boundaries** boolean toggle (checkbox or switch), placed above/below list

When schema has no `TableGroup`s: hide both section and toggle entirely.

Pass `tableGroups` and `allTables` as props; derive ungrouped entries inside the component.

- [x] Conditionally render Table Groups section
- [x] Group checkbox rows with Select All / Unselect All
- [x] Ungrouped synthetic row
- [x] Show TableGroup Boundaries toggle
- [x] Section hidden for schemas without TableGroups (AT-1)
- [x] Accessible: section labelled, all inputs have visible labels

---

### T4 · Wire showTableGroupBoundaries through App → Scene

**Priority: high · Depends on: T1, T3 · Blocks: T8**

- Pass `filterState.showTableGroupBoundaries` as a prop to `Scene`
- In `Scene.tsx`, render `TableGroupBoundary` components only when the prop is `true`
- Boundaries for groups whose tables are all hidden should also not render (the group won't appear in `groupBoundaries` once `applyFilters` removes those tables — confirm during impl)
- Toggling boundaries must not affect table visibility, refs, layout, or hover state

- [x] Add `showTableGroupBoundaries` prop to `Scene`
- [x] Conditional `TableGroupBoundary` rendering
- [x] Verify toggle has no side-effects on tables/refs/layout

---

### T5 · Refactor LoadFileButton for File System Access API

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

- [x] Detect API availability
- [x] `showOpenFilePicker` preferred path
- [x] `input[type=file]` fallback
- [x] `onHandleChange` callback wired in `App.tsx`
- [x] TypeScript types correct (may need `@types/wicg-file-system-access` or `lib.dom` augmentation)

---

### T6 · Add Reload button to toolbar

**Priority: high · Depends on: T5 · Blocks: T8**

Add a reload icon button immediately to the right of _Load file…_ in `App.tsx`:

- Always rendered (not hidden when disabled)
- Enabled only when a `FileSystemFileHandle` is stored in state
- On click: `handle.getFile()` → read text → trigger same load flow as fresh load (including `setFilterState(defaultFilterState(parsed))`)
- On error: show existing error banner, preserve prior scene
- Accessible name: `Reload current file`
- Disabled tooltip/description: _Reload is available only for files opened with persistent file access_

- [x] Store `fileHandle: FileSystemFileHandle | null` in `App` state
- [x] Reload button component or inline JSX
- [x] Enabled/disabled state wired to handle availability
- [x] Reload flow: getFile → parse → setSchema + setFilterState reset
- [x] Error handling: banner shown, prior scene kept
- [x] Accessible label and disabled description

---

### T7 · Unit tests for extended filter logic

**Priority: medium · Depends on: T1, T2**

Add/extend unit tests in `tests/unit/parser/`:

- `defaultFilterState` with and without `TableGroup`s
- `isFilterActive` detects group and boundary changes
- `applyFilters` intersection: group hidden → table hidden; per-table hidden survives group toggle; ungrouped sentinel; refs filtered

Use `it.each` for data-driven cases.

- [x] `defaultFilterState` tests
- [x] `isFilterActive` tests for new fields
- [x] `applyFilters` group × table intersection tests
- [x] `pnpm test:run` passes, coverage ≥ 80 % on modified parser files

---

### T8 · Playwright E2E tests (AT-1 through AT-10)

**Priority: medium · Depends on: T3, T4, T6**

Add Playwright tests in `tests/visual/` covering all PRD acceptance tests:

| AT    | Scenario                                                                  |
| ----- | ------------------------------------------------------------------------- |
| AT-1  | No group section for ungrouped schema; section appears for grouped schema |
| AT-2  | Hide group → all its tables disappear                                     |
| AT-3  | Refs to hidden-group tables disappear                                     |
| AT-4  | Ungrouped filter hides only ungrouped tables                              |
| AT-5  | Boundary toggle hides/restores group boxes                                |
| AT-6  | Per-table hidden table stays hidden after group re-enable                 |
| AT-7  | Reload button disabled for default schema, enabled after file load        |
| AT-8  | Reload reflects on-disk changes (write temp file, modify, reload)         |
| AT-9  | Reload resets filters to default                                          |
| AT-10 | Reload failure shows error banner, preserves prior scene                  |

Add a grouped DBML fixture to `tests/fixtures/` if one does not exist.

- [x] Grouped schema fixture in `tests/fixtures/`
- [x] AT-1 through AT-6 (filter dialog tests)
- [x] AT-7 through AT-10 (reload tests)
- [x] `pnpm test:e2e` passes with no console errors

---

## Definition of Done

- All 8 `tk` tasks closed
- `pnpm lint && pnpm typecheck && pnpm test:run && pnpm test:e2e` all pass
- No `eslint-disable` comments, no `@ts-ignore`
- `PROJECT_OVERVIEW.md` updated if architecture changed

When all tasks are complete the agent should output <promise>DONE</promise>
