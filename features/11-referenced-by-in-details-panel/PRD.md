# PRD: Referenced By In Details Panel

## Problem

The Details panel currently shows outbound relationship context (for example,
"Referenced fields" / "Referenced Table") for the currently hovered item.

It does not show inbound relationship context, so users cannot quickly see:

- Which fields reference the hovered field.
- Which tables reference the hovered table.

This makes reverse navigation harder, especially in larger schemas where incoming
references are just as important as outgoing references.

## Goal

Add a new "Referenced By" section in the Details panel directly below the
existing "Referenced fields" / "Referenced Table" section.

The section should show inbound references for both field and table targets.

## Success Criteria

1. When hovering a field, the Details panel shows "Referenced By" if one or more
   fields reference that field.
2. For field hover, "Referenced By" lists referencing items as
   `table.column` (or equivalent clear format), including references from the
   same table and from other tables.
3. When hovering a table, the Details panel shows "Referenced By" if one or more
   other tables contain fields that reference any field in the hovered table.
4. For table hover, "Referenced By" lists unique table names (no duplicates),
   representing all tables that reference fields in the hovered table.
5. If there are no inbound references for the current hover target, the
   "Referenced By" section is hidden.
6. Existing "Referenced fields" / "Referenced Table" behavior is unchanged.
7. `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.
8. A headed visual verification screenshot confirms the new section appears in
   the correct position and is readable.

## Scope

### In scope

- Compute inbound reference data from parsed schema relationships.
- Extend hover context (or equivalent view model) with "referenced by" data.
- Render a "Referenced By" section in `NavigationPanel` directly below the
  existing outbound reference section.
- Handle both field-hover and table-hover behaviors.
- Deduplicate and sort display values for stable UI output.

### Out of scope

- Changing parser behavior or DBML semantics.
- Changing relationship line rendering in the 3D scene.
- Adding new interaction modes or controls.

## UX / Display Rules

1. Placement: Render "Referenced By" immediately below the existing
   "Referenced fields" / "Referenced Table" section in the Details panel.
2. Field hover display:
   - Show only when inbound field references exist.
   - Show a list of referencing fields in `table.column` format.
3. Table hover display:
   - Show only when inbound references exist.
   - Show a list of referencing table names (not columns).
4. Empty state:
   - Do not show the section when empty.
5. Ordering:
   - Sort values alphabetically for deterministic output.

## Technical Notes

- Build an inverse lookup from the existing relationship data:
  - `target field -> referencing fields`
  - `target table -> referencing tables`
- Ensure self-references are included when they exist.
- Avoid duplicate rows in UI output.

## Acceptance Tests

| #   | Scenario                               | Expected                                                              |
| --- | -------------------------------------- | --------------------------------------------------------------------- |
| 1   | Hover field with inbound refs          | "Referenced By" appears with one entry per referencing `table.column` |
| 2   | Hover field with no inbound refs       | "Referenced By" is hidden                                             |
| 3   | Hover table referenced by other tables | "Referenced By" appears with unique table names                       |
| 4   | Hover table with no inbound refs       | "Referenced By" is hidden                                             |
| 5   | Self-reference case                    | Self-referencing field/table is included in list                      |
| 6   | Existing outbound references           | "Referenced fields" / "Referenced Table" still render as before       |
| 7   | `pnpm lint && pnpm typecheck`          | No errors                                                             |
| 8   | `pnpm test:run`                        | All tests green                                                       |
