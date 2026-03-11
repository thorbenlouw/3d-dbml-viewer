# PRD — Enum Rendering in Table Cards (Feature 19)

## Problem

DBML supports `Enum` declarations, and many real-world schemas use them
extensively for fields that accept a fixed set of values (order statuses,
user roles, event types, etc.). When a field's type is an enum, the viewer
currently renders the enum type name as a plain string — indistinguishable from
any other type — and does not surface the enum's possible values at all.

This makes the viewer less useful than the raw DBML file for understanding the
domain model, because the allowed values for enum-typed fields are completely
invisible.

## Goal

Parse DBML `Enum` declarations and render them in table cards so users can see
both that a field's type is an enum and what values that enum accepts. Enum
values should be accessible without leaving the 3D scene.

## Non-Goals

- Editing enum values in the app.
- Rendering enums as standalone "nodes" in the 3D scene (they are metadata for
  fields, not entities with relationships).
- Filtering or searching by enum value.
- Rendering check constraints or index metadata (separate backlog items).

---

## Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Enum declarations in the DBML `Project` are parsed and stored in the schema model. |
| 2 | Fields whose type name matches a defined enum are marked as enum-typed in the parsed schema. |
| 3 | An enum-typed field in a table card displays a visual indicator that its type is an enum (e.g. a distinct badge or icon). |
| 4 | The enum's possible values are accessible from the table card without navigation — either inline (collapsed) or via hover/tooltip. |
| 5 | Each enum value's optional `note` is surfaced where space allows (tooltip or details panel). |
| 6 | If a field's type name does not match any declared enum, no enum UI is shown for it. |
| 7 | The feature works correctly for enums defined in the same schema and referenced across tables. |
| 8 | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass. |

---

## DBML Shape and Parser Behaviour

`@dbml/core` exposes enums at `schema.enums[]`. Each enum has:

```ts
{
  name: string;           // e.g. "order_status"
  values: Array<{
    name: string;         // e.g. "pending"
    note: string | null;  // optional annotation
  }>;
}
```

A field whose type is an enum has `field.type.type_name` matching the enum name.
The match is by name within the same schema scope.

### Parser changes

1. Add `ParsedEnum` to the schema type:
   ```ts
   interface ParsedEnumValue {
     name: string;
     note?: string;
   }
   interface ParsedEnum {
     name: string;
     values: ParsedEnumValue[];
   }
   ```
2. Extend `ParsedSchema` with `enums?: ParsedEnum[]`.
3. Extend `ParsedColumn` with `enumValues?: ParsedEnumValue[]` — populated during
   parsing when `field.type.type_name` matches a declared enum. This avoids
   requiring consumers to do their own enum name resolution.

---

## UX Specification

### Enum indicator badge

An enum-typed field should carry a visual cue that its type is an enum — for
example, a small `E` badge or an icon beside the type name, styled consistently
with existing `PK`, `FK`, `NN`, and `UQ` badges.

### Enum value access

Enum values should be accessible without requiring navigation or a separate
click workflow. Preferred approach: on hover over the enum indicator (or the
field row), the hover/navigation panel shows the field's enum values as a
list. If the enum has `note` annotations on values, those should appear beside
each value.

The table card itself should remain compact — enum values should not expand the
card inline, as a large enum (20+ values) would make the card unreadable in the
3D scene.

### Field detail mode interaction

- `full` and `ref-fields-only` modes: enum indicator and hover values are shown.
- `table-only` mode: field rows are hidden; no enum display is needed.

---

## Technical Approach

### Data flow

```
@dbml/core AST
  → parser resolves enum names to values per field
  → ParsedColumn.enumValues populated
  → applyFilters passes enumValues through unchanged
  → TableCard renders enum badge when enumValues is defined
  → hover context exposes enumValues for the hovered field
  → NavigationPanel renders enum value list
```

### No graph-model changes required

Enums are field-level metadata, not nodes or edges. The graph model and layout
engine do not need to change.

---

## Acceptance Tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | DBML with no enums | No enum badges; no change to existing rendering |
| 2 | Field with enum type | Enum badge appears on the field row |
| 3 | Hover over an enum field | Navigation panel shows enum values list |
| 4 | Enum value has a `note` | Note text appears beside the value in the panel |
| 5 | Field type matches no declared enum | No enum badge shown |
| 6 | Large enum (20+ values) | Card remains compact; values accessible via hover only |
| 7 | `table-only` filter mode active | Enum indicators not visible (field rows hidden) |
| 8 | Schema reloaded | Enum state resets correctly with the new schema |
