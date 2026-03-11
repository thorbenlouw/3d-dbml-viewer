# PRD — View Filters: TableGroups and Reload Current File (Feature 17)

## Problem

The current **View Filters** feature only lets users control field-detail mode
and per-table visibility. That becomes limiting for schemas that already use
DBML `TableGroup`s:

- users cannot quickly hide or isolate entire groups of related tables
- users cannot suppress the `TableGroup` bounding boxes without hiding the
  grouped tables themselves
- after loading a DBML file from disk, there is no quick way to reload the same
  file if it changes on disk

This makes iterative workflows slower, especially when users are editing a DBML
file in another tool while keeping the viewer open.

## Goal

Extend the existing View Filters workflow so users can:

1. filter visibility by `TableGroup`
2. show or hide `TableGroup` bounding boxes independently of table visibility
3. reload the currently loaded file from disk via a dedicated toolbar button

## Non-Goals

- Persisting filter state across page reloads
- Editing `TableGroup`s from within the app
- Auto-reloading files via filesystem watchers
- Supporting arbitrary reload of files that were never loaded from disk

---

## Success Criteria

| # | Criterion |
|---|-----------|
| 1 | If the loaded schema contains one or more `TableGroup`s, the View Filters dialog shows a **Table Groups** section. |
| 2 | Users can show/hide all tables in a `TableGroup` with a single control. |
| 3 | Group filtering applies live and removes hidden-group tables from both rendering and force simulation input. |
| 4 | Refs remain visible only when both endpoint tables are still visible after group and table filtering are applied. |
| 5 | If the schema contains one or more `TableGroup`s, the dialog shows a **Show TableGroup Boundaries** toggle. |
| 6 | Turning the boundary toggle off hides all `TableGroup` bounding boxes while keeping tables visible. |
| 7 | If the schema contains no `TableGroup`s, neither the group filter section nor the boundary toggle is shown. |
| 8 | A reload icon button appears beside **Load file…** in the toolbar. |
| 9 | When a reloadable disk-backed file is active, clicking the reload button reloads that file and resets filters to defaults for the new contents. |
| 10 | When no reloadable file is active, the reload button is disabled and clearly indicates why. |

---

## User Stories

- As a user exploring a large grouped schema, I want to hide an entire
  `TableGroup` at once so I can focus on a subset of the model.
- As a user who likes group-based placement but finds the bounding boxes noisy,
  I want to hide the boxes while keeping the grouped tables visible.
- As a user editing a DBML file in another editor, I want to reload the current
  file without going through the file picker again.

---

## Functional Requirements

### 1. TableGroup filtering

If `ParsedSchema.tableGroups` is non-empty, the View Filters dialog must include
a **Table Groups** section.

Behavior:

- Each named `TableGroup` is listed once, sorted alphabetically.
- Each row has a checkbox and the group name.
- Unchecking a group hides all tables that belong to that group.
- Checking a group restores visibility for that group, subject to any
  lower-level per-table filters that are still off.
- Group filtering applies before layout/rendering, not as a visual-only layer.

#### Ungrouped tables

Schemas may contain both grouped and ungrouped tables.

To make filtering complete and predictable, the UI should include a synthetic
`Ungrouped` entry whenever the schema contains at least one table without a
`tableGroup`.

Behavior:

- `Ungrouped` behaves like any other group-level visibility filter.
- It does not correspond to a `TableGroup` bounding box.

### 2. Interaction between group and table filters

Visibility should be the intersection of:

- the selected `TableGroup`/`Ungrouped` filters
- the selected individual table filters

That means:

- if a group is hidden, all its tables are hidden even if an individual table
  inside that group remains checked
- if a group is visible but a specific table is unchecked, that table stays
  hidden

This avoids surprising reappearance of manually hidden tables when a group is
re-enabled.

### 3. TableGroup boundary visibility

If the schema contains one or more named `TableGroup`s, the View Filters dialog
must show a boolean toggle:

- Label: **Show TableGroup Boundaries**

Behavior:

- `on`: render `TableGroupBoundary` components for visible groups
- `off`: render no `TableGroupBoundary` components
- toggling this setting must not affect table visibility, refs, layout, or
  hover/navigation content

Default:

- `true` when the schema has at least one named `TableGroup`
- hidden entirely when there are no named `TableGroup`s

### 4. Reload current file

Add a toolbar button immediately to the right of **Load file…**.

Visual:

- icon-only or icon-first button using a reload/refresh glyph
- tooltip / accessible name: **Reload current file**

Behavior:

- enabled only when the current schema was loaded from a reloadable file source
- disabled for the built-in default example and any non-reloadable source
- clicking it reloads the same file from disk
- after reload, schema parsing/layout runs exactly as with a fresh load
- after reload, filters reset to defaults derived from the new schema contents
- if reload fails, show the existing error banner

#### Important browser constraint

Reloading a file "in case it changed on disk" requires a persistent file handle,
not just the original `File` snapshot from an `<input type="file">`.

Therefore the implementation should explicitly support:

- **Preferred path**: File System Access API (`showOpenFilePicker`) where
  available, storing a `FileSystemFileHandle` for later reloads
- **Fallback path**: if persistent file handles are unavailable, the reload
  button is disabled and explains that reload requires browser file-access
  support

The feature should not pretend to reload a stale `File` snapshot.

---

## UX Specification

### View Filters dialog structure

When `TableGroup`s exist, the dialog order should be:

1. Field Detail
2. Table Groups
3. Tables

#### Table Groups section

- heading: **Table Groups**
- inline controls:
  - `Select All`
  - `Unselect All`
- scrollable list when needed
- each row shows:
  - checkbox
  - group name
  - optional secondary count text, e.g. `4 tables`

#### Boundary toggle

- placed within the Table Groups section, above or below the list
- shown only if there is at least one named `TableGroup`

### Toolbar reload button

- positioned next to **Load file…**
- disabled state must be visually obvious
- disabled tooltip / accessible description should explain:
  - `Reload is available only for files opened with persistent file access`

---

## Data / State Changes

The current `FilterState` will need to expand to capture:

- visible `TableGroup` selections
- boundary visibility preference

Representative shape:

```ts
interface FilterState {
  fieldDetailMode: 'full' | 'ref-fields-only' | 'table-only'
  visibleTableIds: Set<string>
  visibleTableGroupIds: Set<string>
  showTableGroupBoundaries: boolean
}
```

Notes:

- the final property names may differ
- the state must still reset on each successful new schema load
- default-state calculation and active-filter detection must include the new
  group-related fields

---

## Acceptance Tests

### AT-1 — Group filters appear only when groups exist

Load a schema with no `TableGroup`s. Open View Filters. Verify there is no
Table Groups section and no boundary toggle.

Load a schema with one or more `TableGroup`s. Open View Filters. Verify both
appear.

### AT-2 — Hide a TableGroup

Load a grouped schema. Uncheck one `TableGroup`. Verify all tables in that
group disappear from the scene.

### AT-3 — Edge visibility after group filtering

Given refs between tables in visible and hidden groups, hide one group. Verify
refs touching hidden tables disappear and unrelated refs remain.

### AT-4 — Ungrouped filtering

Load a schema containing both grouped and ungrouped tables. Hide `Ungrouped`.
Verify only ungrouped tables disappear.

### AT-5 — Boundary toggle

Load a grouped schema. Toggle **Show TableGroup Boundaries** off. Verify the
group boxes disappear while tables and refs remain visible. Toggle it on again.
Verify the group boxes return.

### AT-6 — Group and table filter interaction

Hide a specific table in a visible group. Hide the group, then re-show it.
Verify the manually hidden table remains hidden.

### AT-7 — Reload button availability

With the built-in default schema active, verify the reload button is disabled.
Load a reloadable disk-backed file. Verify the reload button becomes enabled.

### AT-8 — Reload picks up on-disk changes

Open a reloadable DBML file, modify it on disk outside the app, then click the
reload button. Verify the scene updates to reflect the file’s new contents.

### AT-9 — Reload resets filters

Apply non-default filters, then reload the current file. Verify filter state is
reset to the default for the reloaded schema.

### AT-10 — Error handling

Make the current file unavailable or invalid, then click reload. Verify the app
shows the existing error banner and keeps the prior scene until a successful
load.

---

## Risks

- Browser support for persistent file handles is uneven; the reload feature must
  degrade honestly rather than appearing to work with stale data.
- Group and table filters can become confusing if their interaction is not
  explicitly defined as intersection-based.
- Large schemas with many groups may require careful dialog layout to avoid a
  cramped UI.

## Open Questions — Resolved

1. **Should the group section include table counts only, or also field/ref counts?**
   Resolved: table counts only (`N tables` suffix per row). Field/ref counts add
   complexity without clear user benefit at this stage.

2. **Should the reload button be hidden when unavailable, or always shown disabled?**
   Resolved: always shown, disabled. Hiding it entirely would confuse users who
   expect the button to exist; a disabled button with a descriptive tooltip
   communicates the capability and its current constraint.

3. **Should reloading preserve camera position, or behave like a normal fresh
   schema load and re-fit the camera?**
   Resolved: camera position is preserved. Reload calls the same `handleSchemaLoad`
   path as a fresh load, which updates schema and filter state but does not reset
   the camera — the user's spatial context is maintained across iterative edits.
