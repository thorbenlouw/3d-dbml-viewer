# ADR-002: Filter as Pre-Layout Derivation, Not Visual-Only Hiding

**Status:** Accepted
**Date:** 2026-03-11
**Feature:** Feature 16 — View Filters; Feature 17 — View Filters: TableGroups and Reload

---

## Context

When users hide tables or groups via View Filters, the app must decide at what
point in the pipeline the exclusion takes effect. There are two natural places:

1. **Visual-only hiding:** pass the full schema (all tables, all refs) to the
   layout engine and force simulation, then simply skip rendering hidden nodes
   and edges in the React Three Fiber scene.

2. **Pre-layout derivation:** produce a derived `filteredSchema` that contains
   only the visible tables and their valid refs before anything reaches the
   layout engine.

The choice matters because the force simulation uses the node and link arrays
to compute positions. Hidden nodes left in the simulation still exert forces
and occupy positions in the layout, even though they are not rendered.

---

## Decision

Filtering is implemented as a **pre-layout derivation step**.

`applyFilters(schema, filterState)` produces a new `ParsedSchema` containing
only the visible tables and the refs whose both endpoints are visible. This
derived schema — not the original — is passed to `useForceSimulation` and
subsequently to the renderer.

---

## Reasons

**1. Hidden nodes distort the layout of visible nodes**

A force simulation positions every node in its input. If a hidden table remains
in the simulation, its collision and link forces pull visible tables toward
positions that serve a node the user cannot see. As schemas grow and more tables
are hidden, this distortion compounds. The visible layout becomes increasingly
wrong relative to what the user is actually looking at.

**2. Phantom edges between hidden tables break ref rendering**

If a ref connects two hidden tables, the edge object still exists in the link
array. Rendering code must then check visibility on every edge draw, and the
simulation tick processes link forces for edges the user will never see.
Removing them from the source is simpler and cheaper.

**3. Pure functions are easier to test**

`applyFilters` is a pure function: given schema + filterState, it returns a
deterministic filtered schema. This is straightforward to unit-test with fixture
data. Visual-only hiding pushes the filter logic into render components, where
it mixes with Three.js state and is harder to test in isolation.

**4. The pipeline stays unidirectional and composable**

The existing data flow is: parse → filter → layout → render. Treating filter as
a pipeline stage keeps each stage ignorant of the others. The layout engine does
not need to know about filter state; the renderer does not need to know about
the simulation. Visual-only hiding would couple the renderer to filter state,
breaking this separation.

---

## Consequences

- `applyFilters` runs on every `filterState` change before the schema reaches
  the layout engine. For typical schemas this is fast (pure array filter); for
  very large schemas with many filter changes in quick succession this may
  warrant memoisation.
- The renderer receives only visible tables and refs. It does not need any
  "is this node hidden?" guard in its render paths.
- `defaultFilterState` and `isFilterActive` remain in the parser layer,
  co-located with `applyFilters`, since they all operate on the same schema
  type.
- If a future requirement needs visual effects on hidden nodes (e.g. a faded
  ghost mode), a separate "ghost schema" derivation should be introduced rather
  than reverting to visual-only hiding in the main render path.

---

## Alternatives Considered

**Visual-only hiding (skip render, keep in simulation)**
Each renderer component would check `filterState.visibleTableIds` and return
`null` for hidden tables. Refs would check both endpoint visibilities. Rejected
because hidden nodes distort the layout and the render components accumulate
filter-awareness that belongs in the pipeline, not the view layer.

**Post-layout, pre-render derivation**
Run the full simulation with all nodes, then derive the visible set before
rendering. Avoids phantom-edge rendering but still distorts layout. Rejected
for the same layout-correctness reason as visual-only hiding.
