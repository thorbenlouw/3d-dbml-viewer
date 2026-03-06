# TODO — UX Polish: Camera Fit, Readable Labels, Tighter Layout, Fly-to Table

Reference: `features/06-ux-polish/PRD.md`

---

## 1 — Tighter default link distance

**Files**: `src/layout/useForceSimulation.ts`

- [x] Change `.force('link', forceLink(...).distance(3))` → `.distance(1.5)`.
- [x] Verify no overlap with the insurance example schema by running the app and inspecting visually.

---

## 2 — Emit `onSettled` callback from `useForceSimulation`

**Files**: `src/layout/useForceSimulation.ts`

The simulation should notify Scene when the layout has converged so the camera
can auto-fit.

- [x] Add an optional `onSettled?: (nodes: SimulationNode[]) => void` parameter to `useForceSimulation`.
- [x] In the rAF `tick` loop, after calling `s.tick()`, check if `s.alpha() < 0.05` and `!hasSettled`. If true, set `hasSettled = true` and call `onSettled(liveNodesRef.current.map(toSimulationNode))`.
- [x] Reset `hasSettled` to `false` whenever the `schema` changes (i.e. at the top of the `useEffect`), so a new file load re-triggers settlement.
- [x] Export the updated hook signature in `src/layout/useForceSimulation.ts`.

---

## 3 — Auto-fit camera to settled layout in Scene

**Files**: `src/renderer/Scene.tsx`

- [x] Add `settledFrameRef = useRef<CameraFrame | null>(null)` to store the captured frame from the most recent settled layout.
- [x] Pass an `onSettled` callback to `useForceSimulation` that:
  - Recomputes `framePoints` from the settled node positions and table dimensions.
  - Calls `computeCameraFrameFromPoints(framePoints, 60)` to get the fit frame.
  - Stores the result in `settledFrameRef.current`.
  - If this is the **first** settlement (no previous frame), snaps the camera immediately: set `camera.position` and `controls.target` directly (no tween). Use a flag `hasFittedOnce` ref.
  - If this is a subsequent settlement (new file loaded), triggers the tween via `tweenStateRef` using `RESET_TWEEN_DURATION_MS`.
- [x] Update `handleResetView` to use `settledFrameRef.current` instead of re-computing from current `framePoints`. Fall back to `computeCameraFrameFromPoints(framePoints, 60)` if `settledFrameRef.current` is null.
- [x] Remove the `initialFrame` useMemo that was previously used for the initial camera position — the Camera `position` prop on `<Canvas>` can remain as a placeholder (it will be overridden by the settle snap), but ensure it is not re-triggering layout.

> **Note**: accessing `camera` and `controls` from within the `onSettled` callback (which runs outside the R3F render loop) requires storing refs. `controlsRef` already exists. Add a `cameraRef = useRef<THREE.Camera | null>(null)` and populate it in a `<CameraInitialiser>` child component using `useThree().camera`.

---

## 4 — Distance-adaptive table title scale

**Files**: `src/renderer/TableCard.tsx`, `src/renderer/constants.ts`

The table header `<Text>` should appear larger when the camera is far away.

- [x] Add constants to `constants.ts`:
  ```ts
  export const TITLE_SCALE_MAX = 2.5; // maximum scale multiplier for title group
  export const FLY_TO_DISTANCE = 5; // world units in front of table for fly-to tween
  ```
- [x] In `TableCard.tsx`, wrap the header `<Text>` (and note icon if present in the header) in a `<group ref={titleScaleGroupRef}>`.
- [x] In the existing `useFrame` callback, compute the adaptive scale:
  ```ts
  const t = Math.max(0, Math.min(1, (dist - DISTANCE_NEAR) / (DISTANCE_FAR - DISTANCE_NEAR)));
  const titleScale = 1 + t * (TITLE_SCALE_MAX - 1);
  if (titleScaleGroupRef.current) titleScaleGroupRef.current.scale.setScalar(titleScale);
  ```
  where `dist` is already computed for the opacity calculation (reuse that value).
- [x] Ensure the scale group is positioned at the header's world position so scaling is centred on the title.
- [x] Verify that the title does not clip outside the card boundary at maximum scale — use `maxWidth` on the `<Text>` and accept that large scale is readable even if partially cropped.

---

## 5 — Fly-to table on header double-click

**Files**: `src/renderer/TableCard.tsx`, `src/renderer/Scene.tsx`

- [x] Add `onFlyTo?: (tableId: string) => void` to `TableCardProps` in `TableCard.tsx`.
- [x] On the header hit mesh's `onDoubleClick`, call `onFlyTo?.(node.id)` (in addition to any existing double-click behaviour — check that no existing dbl-click handler conflicts in navigate mode).
- [x] In `Scene.tsx`, implement `handleFlyTo(tableId: string)`:
  - Look up the card node for `tableId` from `cardById`.
  - Compute `endTarget = new THREE.Vector3(node.x, node.y, node.z)`.
  - Compute `endPosition`: take the camera's current forward direction, negate it, normalise, multiply by `FLY_TO_DISTANCE`, add to `endTarget`. This approaches from the current viewing angle.
  - Trigger the tween via `tweenStateRef`.
- [x] Wire `handleFlyTo` into `DraggableTableCard` and pass it down to `TableCard` as `onFlyTo`.
- [x] Only pass `onFlyTo` when `!isRearrangeMode` — in rearrange mode, double-click is already used to unpin.

---

## 6 — Tests

**Files**: `tests/unit/`, `tests/integration/`

- [x] Unit test for `useForceSimulation` (in `tests/unit/layout/useForceSimulation.test.ts`):
  - Verify `onSettled` is called once after the simulation alpha drops below 0.05.
  - Verify `onSettled` is reset and re-fires when a new schema is passed.
- [x] Ensure all existing unit + integration tests pass: `pnpm test:run`.

---

## 7 — Visual verification

- [x] Start the dev server: `pnpm dev`.
- [x] Use Playwright MCP `browser_navigate` + `browser_screenshot` to open `http://localhost:5173`.
- [x] Confirm in the screenshot: all tables visible, not zoomed in to a tiny cluster.
- [x] Load the insurance schema from disk; confirm auto-fit triggers again.
- [x] Double-click a table title; confirm camera flies to it.
- [x] Click Reset View; confirm camera returns to overview.
- [x] Zoom out; confirm table titles scale up and remain readable.
- [x] Save evidence screenshot to `test-evidence/ux-polish.png`.

---

When all tasks above are complete, output: <promise>DONE</promise>
