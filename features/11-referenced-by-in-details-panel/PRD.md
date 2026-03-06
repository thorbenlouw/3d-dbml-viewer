# PRD: Referenced By In Details Panel

## Problem

The Details panel currently shows outbound relationship context (labelled
"References") for the currently hovered item.

It does not show inbound relationship context, so users cannot quickly see:

- Which fields reference the hovered field.
- Which tables reference the hovered table.

This makes reverse navigation harder, especially in larger schemas where incoming
references are just as important as outgoing references.

## Goal

Add a new "Referenced By" section in the Details panel directly below the
existing "References" section.

The section should show inbound references for both field and table targets.

## Success Criteria

1. When hovering a field, the Details panel shows "Referenced By" if one or more
   fields reference that field.
2. For field hover, "Referenced By" lists referencing items as
   `table.column` (or `schema.table.column` when the table belongs to a table
   group), including references from the same table and from other tables.
3. When hovering a table, the Details panel shows "Referenced By" if one or more
   other tables contain fields that reference any field in the hovered table.
4. For table hover, "Referenced By" lists unique table names (no duplicates),
   representing all tables that reference fields in the hovered table.
5. If there are no inbound references for the current hover target, the
   "Referenced By" section is hidden.
6. The outbound references section is titled "References". It is hidden when
   there are no references (no placeholder text is shown).
7. All reference labels use full qualified names: `schema.table.field` when the
   table belongs to a table group, otherwise `table.field`. For table-only
   entries, `schema.table` or `table` respectively.
8. In all reference labels, the `table` or `schema.table` part is rendered in
   bold; the `.field` suffix is rendered in normal weight.
9. `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.
10. A headed visual verification screenshot confirms the new section appears in
    the correct position and is readable.

## Scope

### In scope

- Compute inbound reference data from parsed schema relationships.
- Extend hover context (or equivalent view model) with "referenced by" data.
- Render a "Referenced By" section in `NavigationPanel` directly below the
  existing outbound reference section.
- Handle both field-hover and table-hover behaviors.
- Deduplicate and sort display values for stable UI output.
- Use fully qualified names (`schema.table.field`) when a table belongs to a
  table group; plain `table.field` otherwise.
- Bold the `table` / `schema.table` segment of every reference label.
- Hide the "References" section entirely when there are no outbound references.
- Rename the outbound section title from "Referenced fields" / "Referenced
  tables" to "References".

### Out of scope

- Changing parser behavior or DBML semantics.
- Changing relationship line rendering in the 3D scene.
- Adding new interaction modes or controls.

## UX / Display Rules

1. Placement: Render "Referenced By" immediately below the "References" section
   in the Details panel.
2. Section title: The outbound section is always titled "References".
3. Empty state for outbound: Hide "References" entirely when there are no
   outbound references (no placeholder text).
4. Field hover display:
   - "References": fields this field points to.
   - "Referenced By": fields that point to this field.
   - Show each section only when it has entries.
5. Table hover display:
   - "References": tables this table points to (unique names).
   - "Referenced By": tables that point to this table (unique names).
   - Show each section only when it has entries.
6. Label format:
   - If a table has a table group: `schema.table.field` or `schema.table`.
   - Otherwise: `table.field` or `table`.
   - **Bold** the `table` or `schema.table` part; `.field` is normal weight.
7. Ordering: Sort values alphabetically for deterministic output.

## Technical Notes

- Build an inverse lookup from the existing relationship data:
  - `target field -> referencing fields`
  - `target table -> referencing tables`
- Use the table's `tableGroup` property to construct the qualified name prefix.
- Ensure self-references are included when they exist.
- Avoid duplicate rows in UI output.
- Bold is applied in the render layer by splitting on the last `.`.

## Acceptance Tests

| #   | Scenario                               | Expected                                                                         |
| --- | -------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Hover field with inbound refs          | "Referenced By" appears with one entry per referencing `table.column`            |
| 2   | Hover field with no inbound refs       | "Referenced By" is hidden                                                        |
| 3   | Hover table referenced by other tables | "Referenced By" appears with unique table names                                  |
| 4   | Hover table with no inbound refs       | "Referenced By" is hidden                                                        |
| 5   | Self-reference case                    | Self-referencing field/table is included in list                                 |
| 6   | Hover item with no outbound references | "References" section is hidden (no placeholder text)                             |
| 7   | Hover item with outbound references    | Section titled "References" appears (not "Referenced fields"/"Referenced Table") |
| 8   | Table in a table group                 | Labels show `schema.table.field`; `schema.table` part is bold                    |
| 9   | Table without a table group            | Labels show `table.field`; `table` part is bold                                  |
| 10  | `pnpm lint && pnpm typecheck`          | No errors                                                                        |
| 11  | `pnpm test:run`                        | All tests green                                                                  |
