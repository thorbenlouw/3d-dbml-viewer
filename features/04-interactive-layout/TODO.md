# TODO — Interactive Layout: Drag-to-Separate with Connected Subgraph Pull

Reference spec: `features/interactive-layout/PRD.md`

---

## Task 1 — Extend shared types with SimulationNode

**File:** `src/types/index.ts`

Add a `SimulationNode` interface that extends `LayoutNode` with optional force
constraint fields and a pinned flag:

```ts
export interface SimulationNode extends LayoutNode {
  fx: number | null;
  fy: number | null;
  fz: number | null;
  isPinned: boolean;
  // d3-force-3d internal fields (added at runtime, not set by us)
  vx?: number;
  vy?: number;
  vz?: number;
  index?: number;
}
```

`TableCardNode` should be updated to use `SimulationNode` as its base instead
of `LayoutNode`.

**Acceptance:** `pnpm typecheck` passes; existing tests pass.

---

## Task 2 — Build `useForceSimulation` hook

**File:** `src/layout/useForceSimulation.ts` (new file)

Replace the one-shot `computeLayout` call with a continuously-running
simulation hook.

### API

```ts
export function useForceSimulation(schema: ParsedSchema): {
  nodes: SimulationNode[];
  setPin: (id: string, position: { x: number; y: number; z: number } | null) => void;
  nudge: (id: string, delta: { x: number; y: number; z: number }, neighbourFactor: number) => void;
};
```

### Behaviour

- Initialise `d3.forceSimulation3d()` with the same forces currently in
  `src/layout/index.ts` (manyBody strength -15, link distance 3, centering
  strength 0.1 on all axes).
- Seed initial positions using the existing golden-spiral placement from
  `src/layout/index.ts` (extract to a shared helper so both code paths reuse it).
- Run the simulation on a `requestAnimationFrame` loop (not d3's internal
  timer, which runs off the main thread and conflicts with R3F's render loop).
  Stop the loop when the component unmounts.
- Flush positions into React state at most once per animation frame (use a
  `useRef` to hold the live node array, update React state via `useState` at
  the rAF flush point).
- `setPin(id, pos)`:
  - If `pos` is non-null: set `fx/fy/fz` on the matching node and mark
    `isPinned = true`; reheat simulation to `alpha(0.3)`.
  - If `pos` is null: clear `fx/fy/fz`, set `isPinned = false`; reheat to
    `alpha(0.3)`.
- `nudge(id, delta, neighbourFactor)`:
  - Translate the node at `id` by `delta`.
  - For each direct neighbour (one hop via `schema.refs`) translate by
    `delta * neighbourFactor` — but only if that neighbour is **not** pinned
    and is **not** currently being dragged.
  - Do not trigger a React state flush from nudge — the rAF loop will pick up
    the change on the next frame.
- Build a `neighbourMap: Map<string, string[]>` once on mount from
  `schema.refs`, keyed by both source and target so the lookup is O(1).

**Acceptance:**

- Unit test `tests/unit/useForceSimulation.test.ts` covering:
  - Hook starts with `nodes.length === schema.tables.length`.
  - After `setPin(id, pos)`, the node's `isPinned` is `true` and its position
    matches `pos`.
  - After `setPin(id, null)`, `isPinned` is `false`.
  - `nudge` moves the target node and its direct neighbours.
- `pnpm typecheck` and `pnpm lint` pass.

---

## Task 3 — Build `useDragCard` hook

**File:** `src/renderer/useDragCard.ts` (new file)

Encapsulates all pointer-event logic for dragging a single table card.

### API

```ts
export function useDragCard(params: {
  nodeId: string;
  worldPosition: THREE.Vector3;
  camera: THREE.Camera;
  gl: THREE.WebGLRenderer;
  onDragStart: (id: string, pos: THREE.Vector3) => void;
  onDragMove: (id: string, delta: THREE.Vector3) => void;
  onDragEnd: (id: string, pos: THREE.Vector3) => void;
}): {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
};
```

### Behaviour

- **Drag plane**: a `THREE.Plane` whose normal is the camera's world direction
  (`camera.getWorldDirection(...)`) and which passes through `worldPosition`.
  Recalculated on each `pointerDown`.
- **Raycasting**: use `THREE.Raycaster` with the pointer position from the
  event to find the intersection on the drag plane.
- **onPointerDown**: compute the intersection point, store as `dragStartWorld`;
  call `onDragStart`; call `e.stopPropagation()`.
- **onPointerMove**: if dragging, compute new intersection, compute
  `delta = current - previous`, call `onDragMove(id, delta)`, update previous.
- **onPointerUp**: call `onDragEnd`; clear drag state; call `e.stopPropagation()`.
- **onDoubleClick**: call `onDragEnd(id, worldPosition)` with a sentinel
  `null`-equivalent to trigger unpin (distinguish from a normal release via
  a boolean parameter on `onDragEnd`).
- The hook does **not** directly mutate simulation state — it only calls the
  callbacks; the caller (Scene) connects them to `useForceSimulation`.

**Acceptance:**

- Unit test `tests/unit/useDragCard.test.ts` with mocked camera/raycaster:
  - `onPointerDown` → `onDragStart` called once with correct world position.
  - `onPointerMove` → `onDragMove` called with correct delta.
  - `onPointerUp` → `onDragEnd` called; subsequent `onPointerMove` is a no-op.
  - `onDoubleClick` → `onDragEnd` called with `isPinRelease: true`.
- `pnpm typecheck` and `pnpm lint` pass.

---

## Task 4 — Update `TableCard` to use drag events and show pin indicator

**File:** `src/renderer/TableCard.tsx`

### Changes

1. Accept new props:
   ```ts
   dragHandlers: ReturnType<typeof useDragCard>;
   isPinned: boolean;
   ```
2. Attach `dragHandlers.onPointerDown`, `onPointerMove`, `onPointerUp`, and
   `onDoubleClick` to the existing invisible hit-mesh (the transparent box
   covering the full card that already handles note-icon clicks).
3. **Pin indicator**: when `isPinned` is `true`, render a small filled circle
   mesh (sphere, radius 0.06) in the top-right corner of the card header,
   coloured white at 80% opacity. Add a `<Text>` tooltip "double-click to
   release" that appears on hover (use `onPointerEnter/Leave` state).
4. Change the canvas `cursor` style:
   - Idle: `'pointer'` (already the default hover for interactive cards).
   - Drag in progress: `'grabbing'` — set `gl.domElement.style.cursor`.
   - Release: restore to `'default'` (OrbitControls will set it back to its
     own cursor on re-enable).

**Acceptance:**

- Existing note-click behaviour is unchanged.
- `pnpm typecheck` and `pnpm lint` pass.

---

## Task 5 — Wire everything together in `Scene.tsx`

**File:** `src/renderer/Scene.tsx`

### Changes

1. Replace the one-shot `computeLayout(schema)` call (and the layout import)
   with `useForceSimulation(schema)`.
2. Create a `isDragging` ref (`useRef(false)`).
3. For each table card, create a `useDragCard` instance (or pass shared
   callbacks via a single drag-manager approach — one active drag at a time).
   Wire:
   - `onDragStart(id, pos)` → `setPin(id, pos)`; set `isDragging.current = true`;
     disable OrbitControls (`controlsRef.current.enabled = false`).
   - `onDragMove(id, delta)` → `nudge(id, delta, 0.6)`.
   - `onDragEnd(id, pos, isPinRelease)`:
     - If `isPinRelease` (double-click): `setPin(id, null)`.
     - Otherwise: `setPin(id, pos)`.
     - Set `isDragging.current = false`.
     - Re-enable OrbitControls.
4. Pass `isPinned` from the simulation node to each `TableCard`.
5. The `OrbitControls` ref already exists (`controlsRef`) — use it.
6. Remove the old `computeLayout` import and the static `useMemo`/`useState`
   that drives the layout if they are no longer needed.

**Acceptance:**

- App loads with the live force simulation (tables settle visually).
- Dragging a table moves it; neighbours follow.
- OrbitControls does not fight the drag.
- Pin indicator appears on release; double-click releases.
- `pnpm typecheck` and `pnpm lint` pass.

---

## Task 6 — Update and extend tests

### 6a — Fix any broken unit tests

The static `computeLayout` function can remain in `src/layout/index.ts` for
unit testing purposes (it is still useful as a synchronous helper in tests).
No changes to existing test files should be needed if the function is kept.

### 6b — `tests/unit/useForceSimulation.test.ts`

Write tests as described in Task 2. Use `renderHook` from
`@testing-library/react`.

### 6c — `tests/unit/useDragCard.test.ts`

Write tests as described in Task 3. Mock `THREE.Raycaster`.

### 6d — `tests/e2e/interactiveLayout.spec.ts`

Playwright test covering the acceptance steps from the PRD:

1. Load `http://localhost:5173`.
2. Assert canvas is present (existing check).
3. Simulate a drag via `page.mouse` on a table card bounding box.
4. Assert card moved (compare screenshot before/after).
5. Assert other cards did not all move to the same position (neighbours moved,
   far nodes did not).
6. Double-click the card and assert pin indicator disappears.
7. Save screenshot to `test-evidence/interactive-layout.png`.

**Acceptance:** `pnpm test:run` passes; `pnpm test:e2e --headed` passes.

---

## Task 7 — Visual verification with Playwright MCP

1. Ensure `pnpm dev` is running.
2. Use Playwright MCP `browser_navigate` to open `http://localhost:5173`.
3. Take a `browser_screenshot` and confirm:
   - Tables are visible and not all overlapping.
   - After dragging one table, it appears in the dragged position.
4. Save screenshot to `test-evidence/interactive-layout.png`.

---

## Task 8 — Final cleanup

- Run `pnpm lint` and fix any new warnings.
- Run `pnpm typecheck`.
- Run `pnpm test:run` — all tests must pass.
- Commit with message:
  `feat(layout): live force simulation with drag-to-separate and pin`

---

When all tasks are complete the agent should output <promise>DONE</promise>
