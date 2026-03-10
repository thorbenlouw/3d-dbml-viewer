# PRD — View Filters (Feature 16)

## Problem

As DBML schemas grow, the 3D scene becomes cluttered. Users have no way to focus
on a subset of tables or reduce visual noise by hiding field details. Every table
and every field is always rendered, making large schemas hard to explore.

## Goal

Give users fine-grained control over what is rendered in the 3D scene via a
**View Filters** dialog: a field-detail mode selector plus a per-table visibility
toggle list.

---

## Success Criteria

| # | Criterion |
|---|-----------|
| 1 | A "View Filters" button appears in the toolbar, adjacent to the Load File control. |
| 2 | Clicking the button opens a modal dialog. |
| 3 | The dialog contains a **field detail mode** selector with three mutually-exclusive options. |
| 4 | The dialog contains a **scrollable table list** with a checkbox per table. |
| 5 | The dialog has **Select All / Unselect All** controls for the table list. |
| 6 | Unchecked tables disappear entirely from the 3D scene (nodes and all their edges). |
| 7 | An edge is visible only when **both** endpoint tables are checked. |
| 8 | Filter changes apply **live** (no separate Apply/OK button required — or if present, also live-apply). |
| 9 | On new file load, filters reset to defaults (see Defaults section). |
| 10 | Smart default: if the loaded schema has **> 30 tables**, the initial field detail mode is **Table-Only**; otherwise **Full Table**. |

---

## Field Detail Modes

### Full Table (default for ≤ 30 tables)
Render each table node showing **all fields** — name, type, constraints, and
primary/foreign-key indicators exactly as today.

### Ref Fields Only
Render each table node showing **only fields that participate in at least one
relationship** (i.e. the field appears in a `Ref` definition as either endpoint).
Fields with no relationships are hidden from the node body. The table header
(name) is always visible.

### Table Only (default for > 30 tables)
Render each table as a **header-only node** — no field rows at all. Edges
(relationship lines) between visible tables are still drawn so the graph
structure remains readable.

---

## Table Visibility List

- Lists every table in the loaded schema, sorted **alphabetically**.
- Each row: checkbox + table name. Optionally show field count as secondary text.
- **Select All** checks every table; **Unselect All** unchecks every table.
- The list is scrollable; it should handle schemas with 100+ tables without
  layout overflow.

### Filtering behaviour

- A table that is **unchecked** is completely removed from the 3D scene.
- Any edge where **either** endpoint table is unchecked is also removed.
- The force simulation should treat hidden nodes as non-existent (they should
  not influence layout of visible nodes).

---

## Defaults

| Condition | Field Detail Mode | Table Visibility |
|-----------|------------------|-----------------|
| Schema has ≤ 30 tables | Full Table | All tables checked |
| Schema has > 30 tables | Table Only | All tables checked |

Defaults are applied:
- On first file load.
- When a new file is loaded (previous filter state is discarded).
- Filter state is **not** persisted across page reloads.

---

## UI / UX Specification

### Toolbar button
- Label: **"View Filters"** (or a filter/funnel icon with tooltip).
- Positioned immediately to the right of the Load File button.
- When any non-default filter is active (tables hidden OR mode ≠ Full Table),
  the button shows a **visual indicator** (e.g. accent dot or highlighted border)
  so users know filters are active.

### Dialog
- Modal overlay, centred, with a backdrop.
- **Title**: "View Filters"
- **Section 1 — Field Detail**: radio-button group or segmented control for the
  three modes.
- **Section 2 — Tables**: "Select All" / "Unselect All" inline buttons above the
  scrollable checkbox list.
- **Close**: top-right ✕ button and pressing Escape closes the dialog.
- Changes take effect immediately as the user interacts (no explicit Apply step).
- Dialog does not need to be dismissible by clicking the backdrop (to avoid
  accidental closure while interacting with the list).

---

## Out of Scope

- Persisting filter state in localStorage or URL params.
- Filtering by column/field name within a table.
- Saving or naming filter presets.
- Animating table nodes in/out (instant show/hide is sufficient).

---

## Acceptance Tests

### AT-1 — Default mode for small schema
Load a DBML file with ≤ 30 tables. Open View Filters. Verify **Full Table** is
selected and all tables are checked.

### AT-2 — Default mode for large schema
Load a DBML file with > 30 tables. Open View Filters. Verify **Table Only** is
selected and all tables are checked.

### AT-3 — Table Only mode
Select Table Only. Verify table nodes show only their header (no field rows).
Verify edges between tables are still rendered.

### AT-4 — Ref Fields Only mode
Select Ref Fields Only. Verify a table that has ref fields shows only those fields.
Verify a table with no ref fields shows only its header (no field rows).

### AT-5 — Full Table mode
Select Full Table. Verify all fields (including non-ref fields) are visible.

### AT-6 — Uncheck a table
Uncheck a table in the list. Verify it disappears from the 3D scene.

### AT-7 — Edge visibility
Given tables A–B and A–C with refs, uncheck B. Verify the A–B edge disappears
but the A–C edge remains.

### AT-8 — Unselect All / Select All
Click Unselect All. Verify all tables disappear from scene. Click Select All.
Verify all tables reappear.

### AT-9 — Active filter indicator
Apply any non-default filter (e.g. hide one table). Close dialog. Verify the
View Filters toolbar button shows its active-filter indicator.

### AT-10 — Reset on new file load
Apply filters (hide some tables, change mode). Load a new DBML file. Open View
Filters. Verify state has returned to defaults for the new file.

### AT-11 — Escape closes dialog
Open View Filters dialog. Press Escape. Verify dialog closes.
