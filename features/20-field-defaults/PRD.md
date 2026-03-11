# PRD — Field Default Values in Table Cards (Feature 20)

## Problem

DBML fields support a `[default: ...]` attribute that specifies the value a
column receives when no value is supplied on insert. Default values are a normal
part of schema design — they communicate intent, reduce the need for application
code, and often constrain what data the system can contain.

The viewer currently ignores field defaults entirely. A user inspecting a schema
in the viewer cannot tell which fields have defaults or what those defaults are
without returning to the raw DBML file. This is a consistent gap between what
the file says and what the viewer shows.

## Goal

Parse field default values from DBML and display them in table cards so users
can read the full field specification without leaving the 3D scene.

## Non-Goals

- Editing default values in the app.
- Validating that default values are type-correct.
- Rendering check constraints or index metadata (separate features).
- Persisting or exporting defaults — the viewer is read-only.

---

## Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Field default values are parsed from the DBML AST and stored in the schema model. |
| 2 | Fields with a default value display that value in the table card. |
| 3 | All four DBML default types are handled: number, string, boolean, and expression. |
| 4 | Expression defaults (backtick syntax, e.g. `` `now()` ``) are rendered distinctly to indicate they are SQL expressions. |
| 5 | Fields without a default show no default indicator — existing cards are unchanged. |
| 6 | Defaults are visible in `full` and `ref-fields-only` field detail modes; hidden in `table-only` mode (no field rows). |
| 7 | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass. |

---

## DBML Shape and Parser Behaviour

`@dbml/core` exposes field defaults via `field.dbdefault` (note: lowercase
`dbdefault`). When a default is defined, `field.dbdefault` is an object:

```ts
{
  type:  'number' | 'string' | 'boolean' | 'expression';
  value: number | string | boolean;  // string for expression type
}
```

When no default is defined, `field.dbdefault` is `undefined`.

Examples:

| DBML | `type` | `value` |
|------|--------|---------|
| `[default: 0]` | `'number'` | `0` |
| `[default: 'hello']` | `'string'` | `'hello'` |
| `[default: true]` | `'boolean'` | `true` |
| `` [default: `now()`] `` | `'expression'` | `'now()'` |

### Parser changes

Extend `ParsedColumn` with an optional field:

```ts
interface ParsedColumnDefault {
  type: 'number' | 'string' | 'boolean' | 'expression';
  value: string;   // always normalised to string for rendering
}

interface ParsedColumn {
  // ... existing fields ...
  default?: ParsedColumnDefault;
}
```

Convert numeric and boolean values to their string representations during
parsing (`String(value)`) so the renderer has a uniform type to work with.

---

## UX Specification

### Display in the table card

Default values should appear on the field row alongside the existing type
annotation, in a visually secondary style (muted text, smaller size, or a
distinct colour) so they do not compete with the field name and type for
attention.

Suggested format:
- Number/boolean/string: `= 0`, `= true`, `= 'hello'`
- Expression: `` = `now()` `` — rendered in a monospace or code style to
  signal it is a SQL expression, not a literal value.

The default should truncate gracefully if the value is long (e.g. a lengthy
expression), with the full value accessible via the hover/navigation panel.

### Field detail mode interaction

- `full` mode: defaults are shown on field rows.
- `ref-fields-only` mode: defaults are shown on the fields that are rendered
  (ref-participating fields only).
- `table-only` mode: no field rows are rendered; defaults are not visible.

### Navigation panel

When a field with a default is hovered, the navigation panel should include the
default value in the field detail section, untruncated and with type context
(e.g. "Default: `now()` (expression)").

---

## Technical Approach

### Data flow

```
@dbml/core AST (field.dbdefault)
  → parser normalises to ParsedColumn.default
  → applyFilters passes default through unchanged
  → TableCard renders default value on field row
  → hover context exposes default for the hovered field
  → NavigationPanel shows full default with type label
```

### No graph-model or layout changes required

Field defaults are display metadata. The graph model, force simulation, and
layout engine do not need to change.

---

## Acceptance Tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Field with no default | No default shown; card unchanged |
| 2 | Field with number default (`[default: 42]`) | `= 42` shown on field row |
| 3 | Field with string default (`[default: 'pending']`) | `= 'pending'` shown on field row |
| 4 | Field with boolean default (`[default: true]`) | `= true` shown on field row |
| 5 | Field with expression default (`` [default: `now()`] ``) | `` = `now()` `` shown in monospace/code style |
| 6 | Hover over a field with a default | Navigation panel shows full default value and type |
| 7 | Long expression default | Truncated on card; full value in hover panel |
| 8 | `table-only` mode | Field rows hidden; no defaults visible |
| 9 | Schema with no defaults at all | No change to existing rendering |
