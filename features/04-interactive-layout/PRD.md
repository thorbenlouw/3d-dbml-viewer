# PRD — Interactive Layout: Drag-to-Separate with Connected Subgraph Pull

## Problem

The force-directed layout places all tables near each other in a rough sphere.
With 8+ tables and 14+ relationships the result is a dense, overlapping pile.
Users cannot manually untangle specific tables or focus on a sub-schema without
the whole layout shifting underneath them.

Additionally, the current layout runs once at startup and freezes. Once the
simulation converges, positions are fixed and unresponsive to user input.

## Goals

1. **Drag tables in 3D space** — users can grab any table card and move it freely.
2. **Connected subgraph pull** — when a user drags a table, all directly
   connected tables (one hop via any relationship) are pulled along proportionally,
   so the local cluster moves together rather than stretching links.
3. **Live force simulation** — the simulation runs continuously in the background.
   Unpinned tables keep settling; pinned/dragged tables hold their position.
4. **Pin-on-release** — releasing a dragged table pins it at its dropped position
   so it does not drift back into the pile.
5. **Double-click to unpin** — a pinned table can be released back to the simulation
   by double-clicking it.
6. **Clear cursor affordance** — pointer cursor on hover; grab/grabbing cursors
   during drag; no conflict with OrbitControls orbit/pan.

## Non-Goals

- Multi-table selection (marquee/lasso select).
- Persistent layout save/restore across page reload.
- Animated "spring" drag where tables lag behind the cursor.
- Changing the graph topology (adding or removing tables/refs).

## Success Criteria

| #   | Criterion                                                                                  |
| --- | ------------------------------------------------------------------------------------------ |
| 1   | A user can drag any table card in 3D; it follows the pointer in the camera plane.          |
| 2   | Tables directly connected to the dragged table move with it at 60% of the drag delta.      |
| 3   | The force simulation continues running for unpinned tables during and after drag.          |
| 4   | Releasing a drag pins the table; it does not drift.                                        |
| 5   | Double-clicking a pinned table releases it back to the live simulation.                    |
| 6   | OrbitControls orbit/pan is disabled while a drag is in progress and re-enabled on release. |
| 7   | All existing unit and integration tests continue to pass.                                  |
| 8   | Visual correctness verified with Playwright MCP screenshot.                                |

## Design Decisions

### Drag in the camera plane (not world-XYZ axis)

Dragging along a fixed world axis (e.g. XY) feels wrong when the camera is
orbited. The card should follow the pointer on a plane perpendicular to the
camera's look direction passing through the card's current world position.
This is the natural "billboard drag" plane and requires no axis picker UI.

### Connected-neighbour pull

When the dragged table moves by delta **Δ**, each directly-connected neighbour
is translated by `NEIGHBOUR_DRAG_FACTOR * Δ` (default **0.6**).
This keeps local clusters cohesive without rigidly locking the neighbourhood.
Second-degree neighbours are not moved (only one hop).

### Force simulation stays live

Rather than a frozen snapshot, `d3-force-3d` continues running at all times.
Dragged/pinned nodes are given `fx`, `fy`, `fz` constraints so the simulation
respects their position. Unpinned nodes continue to respond to forces.
This means releasing a table into empty space lets the remaining tables
re-settle naturally around the gap.

### Pinning model

- **Dragging**: `fx/fy/fz` set to dragged position each tick (hard pin).
- **Released (pinned)**: `fx/fy/fz` frozen at drop position.
- **Unpinned (double-click)**: `fx = fy = fz = null` — node rejoins simulation.

### State management

Simulation node state lives in a ref (`useRef`) inside a new
`useForceSimulation` hook so it does not trigger React re-renders on every
tick. Layout positions are read back into React state at a throttled cadence
(every N ticks or via `requestAnimationFrame`) to drive Three.js mesh
positions.

## Architecture

```
src/
  layout/
    useForceSimulation.ts   ← new: live d3 simulation hook
  renderer/
    useDragCard.ts          ← new: pointer-event drag logic
    TableCard.tsx           ← modified: forward pointer events; show pin indicator
    Scene.tsx               ← modified: pass simulation state; disable OrbitControls during drag
  types/
    index.ts                ← extended: SimulationNode (adds fx/fy/fz to LayoutNode)
```

### `useForceSimulation`

- Initialises a `d3.forceSimulation` with the same forces as the current
  static `computeLayout` (manyBody -15, link distance 3, centering 0.1).
- Exposes:
  - `nodes: SimulationNode[]` — current positions (updated via `useRef` + state flush).
  - `setPin(id, pos | null)` — pin or unpin a node.
  - `nudge(id, delta)` — translate a node and its direct neighbours.
- Re-heats the simulation (`alpha(0.3)`) whenever a pin changes.

### `useDragCard`

- Listens to `onPointerDown`, `onPointerMove`, `onPointerUp` on the invisible
  hit-mesh that already exists in `TableCard`.
- On `pointerDown`: records drag start position, raycasts to find camera-plane
  intersection point, calls `setPin(id, pos)`, suppresses OrbitControls.
- On `pointerMove`: computes delta from start, calls `nudge(id, delta)`.
- On `pointerUp`: calls `setPin(id, currentPos)` (pin at drop point),
  re-enables OrbitControls.

### Pin indicator

A small filled circle (⬤) drawn above the table name in `TableCard` when
`isPinned === true`. Tooltip "double-click to release" on hover.

## Acceptance Tests (Playwright)

1. Navigate to `http://localhost:5173`.
2. Hover over any table card — pointer cursor appears.
3. Drag a table — it moves; directly connected tables follow.
4. Release — table stays where dropped (does not drift).
5. Double-click the pinned table — it rejoins the simulation.
6. Screenshot saved to `test-evidence/interactive-layout.png`.
