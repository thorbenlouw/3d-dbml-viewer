# ADR-003: Table Identity Derived from Table Name, Not Schema-Qualified Path

**Status:** Accepted (with known limitation — revisit for multi-schema support)
**Date:** 2026-03-11
**Feature:** Feature 01 — Initial View in 3D; affects all features that reference tables by ID

---

## Context

DBML supports a schema namespace prefix on table names:

```dbml
Table public.users { ... }
Table auth.users  { ... }
```

When building the internal graph model from the `@dbml/core` AST, each table
needs a stable string ID used throughout the app: as React component keys, as
force-simulation node IDs, as ref endpoint identifiers, and as filter state
keys.

The options are:

1. **Table name only** — `"users"` — simple, but collides if two schemas define
   a table with the same name.
2. **Schema-qualified name** — `"public.users"` — unique within a DBML file,
   but adds complexity in the common single-schema case.
3. **`@dbml/core` internal numeric ID** — stable within a parse run but opaque,
   not human-readable, and not stable across re-parses of the same content.

---

## Decision

Table IDs are derived from **`table.name`** — the bare table name without a
schema qualifier.

---

## Reasons

**1. The overwhelming majority of real DBML is single-schema**

Most users and most public DBML examples define tables without a schema prefix.
For this common case, `table.name` is unique within the file and requires no
extra handling.

**2. Simplicity across the whole stack**

Table names appear in filter state keys, React keys, force-simulation node IDs,
hover context, and ref endpoint lookups. Using a plain string that matches what
the user sees in their DBML file keeps every layer readable without a
name-resolution step.

**3. Multi-schema support is a separable future concern**

Properly handling `schema.table` identity requires changes to the parser model,
the graph model, the ref endpoint resolution, the hover panel labels, and the
filter state type. Bundling that into v0.1.0 adds significant complexity for a
use case not yet validated as important. A future ADR should address this when
the requirement is confirmed.

---

## Consequences

- **Known collision risk:** if a DBML file defines `public.users` and
  `auth.users`, both will receive the ID `"users"`. Behaviour is undefined —
  one table will silently shadow the other in the graph. This is documented as
  a known limitation in `unimplemented-as-yet.MD`.
- Ref endpoint resolution uses `table.name` to match refs to nodes. This works
  correctly as long as table names are unique within the file.
- The hover/details panel uses `tableGroup.name` as a label qualifier
  (e.g. `commerce.orders`) rather than the DBML schema namespace. This is a
  divergence from the Feature 11 PRD that is also documented as a known
  limitation.
- When multi-schema identity is added, IDs will change. Any persisted state
  (bookmarks, saved layouts) that encodes table IDs will need a migration path.

---

## Alternatives Considered

**Schema-qualified name (`schema.table`)**
Eliminates collision risk but requires every lookup site to understand the
qualifier format. The `@dbml/core` AST exposes `table.schema` as a nullable
field, so the value would be `${table.schema ?? ''}.${table.name}` — awkward
for the default single-schema case where the schema is always empty. Rejected
for v0.1.0; planned for a future iteration.

**`@dbml/core` internal numeric ID**
Stable within a parse but opaque in debug output, logs, and test fixtures.
Makes it harder to write readable test assertions and impossible to use a table
ID meaningfully in a URL or saved state. Rejected.
