# ADR-004: Two-Phase Hierarchical Layout — Group Seeding Then Force Simulation

**Status:** Accepted
**Date:** 2026-03-11
**Feature:** Feature 12 — TableGroups; Feature 17 — View Filters: TableGroups and Reload

---

## Context

The layout engine must position tables in 3D space in a way that is:

- readable — related tables near each other, not randomly scattered
- stable — the layout converges without excessive oscillation
- group-aware — tables belonging to the same DBML `TableGroup` should cluster
  together

The underlying simulation library (`d3-force-3d`) is a force-directed engine:
it takes a flat list of nodes and links, applies configurable forces, and
iterates until the system reaches approximate equilibrium. By default, all nodes
start near the origin and spread outward under repulsion. The simulation has no
built-in concept of groups.

---

## Decision

Layout is implemented in **two phases**:

**Phase 1 — Group seeding (`src/layout/groupLayout.ts`)**
Before the simulation starts, named `TableGroup`s are placed in
non-overlapping world-space regions using a grid-based algorithm
(`placeGroups`). Each table is then seeded near its group's assigned centre
(`computeGroupSeedPositions`). Ungrouped tables are seeded near a separate
region outside the group grid.

**Phase 2 — Force simulation (`src/hooks/useForceSimulation.ts`)**
The seeded positions are used as the starting state for `d3-force-3d`. A weak
group-cohesion force is added to the simulation that pulls each table toward
its group centre during the interactive live simulation. Standard repulsion and
link forces run alongside it.

---

## Reasons

**1. Pure force simulation scatters groups**

Without seeding, all nodes start near the origin. Repulsion pushes them apart,
but there is no force that keeps group members together — only the link forces
between tables that happen to share refs. Tables in the same group that have no
refs to each other end up anywhere in the space. The result does not visually
communicate grouping.

**2. Group-cohesion force alone (without seeding) converges slowly**

A group-cohesion force can be added to keep group members together, but if all
nodes start near the origin, the early simulation ticks are dominated by
repulsion chaos. The cohesion force must fight a large initial state. Adding
seeding gives the simulation a good starting configuration; the forces then
refine a layout that is already roughly correct rather than discovering it from
scratch.

**3. Seeding is deterministic; simulation adds natural variation**

Phase 1 produces a consistent initial layout regardless of schema load order.
The force simulation then applies realistic-looking variation within each
group — tables settle at positions influenced by their actual links. The
combination gives a layout that is predictable in structure but not rigidly
grid-like.

**4. Separation of concerns**

Group placement logic (`groupLayout.ts`) is a pure function of the schema and
can be unit-tested without running a simulation. The simulation hook
(`useForceSimulation`) can be tested independently with pre-seeded positions.
This makes both layers more maintainable than interleaving group logic into the
simulation configuration.

---

## Consequences

- `groupLayout.ts` must be kept in sync with the `TableGroup` shape in the
  parsed schema. Changes to how groups are defined in the parser propagate here.
- The group-cohesion force strength is a tuneable parameter. Too strong and it
  overrides link forces, making intra-group layout rigid. Too weak and groups
  drift during interaction. The current value was chosen empirically.
- Schemas with no `TableGroup`s skip Phase 1 (no groups to place) and run Phase
  2 with all tables seeded near the origin, which is equivalent to plain
  force-directed layout.
- If the group grid algorithm in Phase 1 does not scale well to schemas with
  very many groups, the placement strategy can be replaced without touching the
  simulation layer.

---

## Alternatives Considered

**Pure force simulation with group-cohesion force only (no seeding)**
Simpler — one phase, no placement step. Rejected because convergence is slow
and group separation is unreliable without a good starting configuration,
especially for schemas with many ungrouped tables.

**Fully hierarchical layout (no force simulation)**
Fixed grid or tree layout within each group, groups placed non-overlapping.
Deterministic and fast, but produces rigid, unnatural layouts. Link routing
becomes complex when refs cross group boundaries. Rejected because force
simulation produces more readable spatial relationships for schemas with
cross-group refs.

**Per-group sub-simulation, then composited**
Run a separate force simulation for each group independently, then tile the
results. More physically accurate within groups, but introduces layout
discontinuities at group boundaries and complicates cross-group ref forces.
Complexity not justified for v0.1.0.
