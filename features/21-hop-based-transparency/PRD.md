# PRD — Hop-Based Transparency for Sticky Tables (Feature 21)

## Problem

When a user double-clicks a table to make it "sticky", the force layout
rearranges: direct neighbours pull close, unrelated tables push away. However,
all tables still use only **camera-distance-based opacity** — a table 2 hops
away in the graph can appear just as opaque as a direct neighbour if both happen
to sit at similar camera distances.

This makes it hard to visually distinguish the relational neighbourhood of the
focused table from the rest of the schema. The spatial rearrangement helps, but
the opacity signal is missing.

## Goal

When a table is sticky, apply **graph-distance (hop) based transparency** so
that tables further from the focused table in the relationship graph fade out
progressively. This lets users instantly see which tables are relationally close
to the focused table while retaining a sense of the overall schema structure.

## Non-Goals

- Changing the force layout or spatial rearrangement behaviour.
- Making hop-based transparency configurable via UI controls (can be a follow-up).
- Applying hop-based fading to table group boundaries or project notes cards.
- Editing or modifying sticky/focus mode behaviour itself.

---

## Success Criteria

| #   | Criterion                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | When no table is sticky, opacity behaviour is unchanged (distance-based only).                                                                                 |
| 2   | When a table is sticky, the sticky table itself renders at full opacity (0.95).                                                                                |
| 3   | Tables 1 hop away (direct neighbours via refs) render at full opacity (0.95).                                                                                  |
| 4   | Tables 2 hops away render at reduced opacity (0.50).                                                                                                           |
| 5   | Tables 3+ hops away render at near-transparent opacity (0.10).                                                                                                 |
| 6   | Hop-based opacity is combined with distance-based opacity using `min()` — a table that is both far from the camera AND many hops away gets the strongest fade. |
| 7   | Connection lines between transparent tables also fade proportionally.                                                                                          |
| 8   | Opacity transitions smoothly when sticky mode is activated or deactivated (no abrupt pop).                                                                     |
| 9   | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` all pass.                                                                                                   |
| 10  | The `computeHopDistances` BFS function has unit test coverage.                                                                                                 |

---

## Technical Context

### Existing architecture

The relevant data flow is:

```
DBML → parser → ParsedSchema (tables + refs)
  → useForceSimulation (d3-force-3d, builds neighbourMap)
  → Scene.tsx (manages stickyTableId state)
  → TableCard.tsx (per-frame opacity via useFrame)
  → RelationshipLink3D.tsx (connection line rendering)
```

### Key existing code

| File                                  | Relevant code                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/layout/useForceSimulation.ts`    | `neighbourMap: Map<string, string[]>` — built from `schema.refs`, maps each table ID to its direct neighbours. Already used for sticky force calculations.                                        |
| `src/renderer/Scene.tsx`              | `stickyTableId` state; `handleHeaderDoubleClick()` toggles sticky; passes props to `TableCard`.                                                                                                   |
| `src/renderer/TableCard.tsx`          | `useFrame()` hook (lines ~166-188) calculates opacity from camera distance using `OPACITY_NEAR/FAR` and `DISTANCE_NEAR/FAR` constants. Updates `headerMaterialRef` and `bodyMaterialRef` opacity. |
| `src/renderer/RelationshipLink3D.tsx` | Connection lines rendered with `opacity={0.8}` (hardcoded).                                                                                                                                       |
| `src/renderer/constants.ts`           | `OPACITY_NEAR = 0.95`, `OPACITY_FAR = 0.28`, `DISTANCE_NEAR = 4`, `DISTANCE_FAR = 18`.                                                                                                            |
| `src/renderer/focusMode.ts`           | `FocusModeState`, `toggleStickyTable()`, `activateStickyFocus()`.                                                                                                                                 |

### Computing hop distances

A BFS from the sticky table through the existing `neighbourMap` gives O(V+E) hop
distances for all tables. This only needs to run when `stickyTableId` changes,
not every frame.

---

## UX Specification

### Opacity levels by hop distance

| Hop distance          | Opacity | Visual effect                   |
| --------------------- | ------- | ------------------------------- |
| 0 (sticky table)      | 0.95    | Fully visible                   |
| 1 (direct neighbours) | 0.95    | Fully visible                   |
| 2                     | 0.50    | Noticeably faded                |
| 3+                    | 0.10    | Nearly invisible, ghost outline |

### Combination with distance-based opacity

When sticky mode is active, the final opacity is `min(distanceOpacity, hopOpacity)`.
This ensures that a 1-hop neighbour that happens to be far from the camera still
fades appropriately, and prevents distant unrelated tables from appearing bright.

### Connection lines

Connection lines should inherit the opacity of the more transparent of their two
endpoint tables. A connection between a 1-hop and a 3-hop table should use the
3-hop opacity (0.10).

### Transitions

When sticky mode activates or deactivates, opacity should transition smoothly
(lerp over ~300ms) rather than snapping instantly. The existing `useFrame` loop
can handle this with a target opacity that lerps toward the computed value each
frame.

### No sticky = no change

When `stickyTableId` is null, the hop-based opacity system is completely
inactive. All opacity is determined by camera distance as before.

---

## Technical Approach

### 1. BFS utility function

Add `computeHopDistances(startId: string, neighbourMap: Map<string, string[]>): Map<string, number>`
as a pure function. Place it in `src/layout/hopDistance.ts` (new file) for
testability. Returns a map of `tableId -> hopCount` for all reachable tables.
Unreachable tables (disconnected components) get `Infinity`.

### 2. Expose hop distances from the simulation

In `useForceSimulation`, expose a `hopDistancesRef` or return a `hopDistances`
value that is recomputed when `stickyTableId` changes. This keeps the BFS
computation co-located with the neighbour map that feeds it.

### 3. Pass hop distance to TableCard

`Scene.tsx` passes each `TableCard` a `hopDistance: number | null` prop:

- `null` when no sticky table is active
- The numeric hop distance when sticky mode is on

### 4. Apply hop-based opacity in TableCard

In the existing `useFrame()` hook, after computing `distanceOpacity`:

- If `hopDistance` is not null, compute `hopOpacity` from the constants
- Use `min(distanceOpacity, hopOpacity)` as the final opacity
- Lerp toward the target each frame for smooth transitions

### 5. Apply hop-based opacity to connection lines

Pass hop distances for both endpoint tables to `RelationshipLink3D`. Compute
line opacity as `min(endpointA_hopOpacity, endpointB_hopOpacity)`, replacing the
current hardcoded `0.8`.

### 6. Constants

Add to `src/renderer/constants.ts`:

```typescript
export const HOP_OPACITY_0 = 0.95; // sticky table itself
export const HOP_OPACITY_1 = 0.95; // direct neighbours
export const HOP_OPACITY_2 = 0.5; // 2 hops away
export const HOP_OPACITY_FAR = 0.1; // 3+ hops away
export const HOP_OPACITY_LERP_SPEED = 0.08; // per-frame lerp factor
```

### Files to modify

| File                                  | Change                                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/layout/hopDistance.ts`           | **New** — pure BFS function `computeHopDistances()`                  |
| `src/layout/useForceSimulation.ts`    | Expose hop distances, recompute on `stickyTableId` change            |
| `src/renderer/Scene.tsx`              | Pass `hopDistance` prop to each `TableCard` and `RelationshipLink3D` |
| `src/renderer/TableCard.tsx`          | Use hop-based opacity in `useFrame()` with lerp transition           |
| `src/renderer/RelationshipLink3D.tsx` | Use hop-based opacity for connection lines                           |
| `src/renderer/constants.ts`           | Add hop opacity constants                                            |

---

## Acceptance Tests

| #   | Scenario                                    | Expected                                                                                                             |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | No table is sticky                          | All tables use distance-based opacity only; no change from current behaviour                                         |
| 2   | Double-click a table with direct neighbours | Sticky table and its neighbours are fully opaque; 2-hop tables are visibly faded; 3+ hop tables are nearly invisible |
| 3   | Double-click again to unstick               | All tables smoothly return to distance-based opacity                                                                 |
| 4   | Sticky table with no refs (isolated)        | Only the sticky table is opaque; all others at 0.10                                                                  |
| 5   | Connection between 1-hop and 3-hop table    | Line renders at 0.10 opacity (the more transparent endpoint)                                                         |
| 6   | Camera moves close to a 3-hop table         | Table remains at 0.10 (hop opacity dominates over distance opacity)                                                  |
| 7   | Camera moves far from a 1-hop table         | Table fades based on distance (distance opacity dominates)                                                           |
| 8   | Opacity transitions                         | No abrupt pop when activating/deactivating sticky; smooth lerp visible                                               |
| 9   | Quality gates                               | `pnpm lint`, `pnpm typecheck`, `pnpm test:run` all pass                                                              |
