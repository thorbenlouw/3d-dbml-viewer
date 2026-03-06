# TODO — More UX Improvements: Sticky Focus, Controls, and Context-Aware Layout

Reference: `features/07-more-ux-improvements/PRD.md`

---

## 1 — Add scene-level sticky focus state and wiring

**Files**: `src/renderer/Scene.tsx`, `src/renderer/TableCard.tsx`, `src/types/index.ts` (only if shared type updates are needed)

- [ ] Add `stickyTableId: string | null` state in `Scene.tsx`.
- [ ] Add a table-header double-click callback prop on `TableCard` (for sticky toggle), separate from drag/unpin behavior.
- [ ] Implement toggle behavior in Scene:
  - if clicked table is not sticky, set `stickyTableId` to that table id.
  - if clicked table is already sticky, clear `stickyTableId`.
- [ ] Keep existing rearrange mode behavior intact (double-click for unpin in rearrange mode must not regress).
- [ ] Preserve fly-to behavior and define deterministic precedence when double-clicking header in navigate mode (sticky + fly-to should not conflict).

**Acceptance**:

- [ ] Double-clicking table A header enables sticky for A.
- [ ] Double-clicking A again clears sticky.
- [ ] Double-clicking B while A is sticky switches sticky from A to B.

---

## 2 — Implement sticky table visual indicator (glowing yellow border)

**Files**: `src/renderer/TableCard.tsx`, `src/renderer/constants.ts`

- [ ] Add sticky highlight props to `TableCard` (e.g. `isSticky?: boolean`).
- [ ] Add style constants for sticky border/glow color and intensity.
- [ ] Render a clear yellow border/glow when `isSticky` is true.
- [ ] Ensure sticky glow remains visible even when distance opacity fading is applied to card body/header.
- [ ] Ensure non-sticky cards retain current visuals.

**Acceptance**:

- [ ] Sticky table border is visibly glowing yellow.
- [ ] Glow disappears immediately when sticky is toggled off.

---

## 3 — Sticky camera center behavior and Reset View integration

**Files**: `src/renderer/Scene.tsx`

- [ ] Add sticky-aware camera target logic so sticky table acts as center-of-interest without locking orbit controls.
- [ ] Keep user orbit and wheel interactions functional while sticky is active.
- [ ] Update Reset View behavior:
  - sticky active: reset frame targets sticky-centered composition.
  - sticky inactive: keep baseline global fit behavior.
- [ ] Handle missing sticky node safely (e.g. schema reload removes active sticky id).

**Acceptance**:

- [ ] With sticky enabled, camera center behavior tracks sticky table.
- [ ] Orbit/zoom still works naturally in sticky mode.
- [ ] Reset View uses sticky center when active.

---

## 4 — Add runtime connection `+/-` hold controls

**Files**: `src/renderer/Scene.tsx`, `src/renderer/constants.ts`, `src/layout/useForceSimulation.ts`, `src/renderer/ResetViewButton.tsx` (if reused), optional new component under `src/renderer/`

- [ ] Add UI controls for `Connection -` and `Connection +` in the existing overlay controls area.
- [ ] Implement press-and-hold semantics via pointer down/up/leave/cancel.
- [ ] Add runtime link-distance scalar state in Scene.
- [ ] Extend `useForceSimulation` to accept/update a live link-distance multiplier.
- [ ] Clamp scalar to safe min/max bounds to prevent layout collapse/explosion.
- [ ] Keep final value on release (no auto-reset).

**Acceptance**:

- [ ] Holding `Connection +` visibly loosens spacing in real time.
- [ ] Holding `Connection -` visibly tightens spacing in real time.
- [ ] Releasing control preserves the adjusted spacing.

---

## 5 — Add runtime zoom `+/-` hold controls with stable target/direction

**Files**: `src/renderer/Scene.tsx`, `src/renderer/constants.ts`, optional control component in `src/renderer/`

- [ ] Add UI controls for `Zoom -` and `Zoom +` in the same overlay controls group.
- [ ] Implement press-and-hold continuous zoom updates.
- [ ] Update camera radius only (distance to current target), preserving target and forward direction.
- [ ] Respect OrbitControls min/max distance constraints.
- [ ] Avoid interaction conflict with existing tween flows (reset/fly-to).

**Acceptance**:

- [ ] Holding zoom controls smoothly moves camera closer/farther.
- [ ] Target and view direction remain stable while zooming.

---

## 6 — Implement focus-aware layout biasing for sticky mode

**Files**: `src/layout/useForceSimulation.ts`, `src/renderer/Scene.tsx`, `src/renderer/constants.ts`

- [ ] Pass `stickyTableId` into the simulation hook (or equivalent runtime update API).
- [ ] Build/derive direct-neighbor set for sticky table from refs graph.
- [ ] When sticky is active:
  - [ ] Increase attraction for sticky <-> directly linked neighbors.
  - [ ] Bias linked neighbors toward a near ring/plane around sticky node.
  - [ ] Apply mild repulsion/push for unrelated nodes away from sticky neighborhood.
- [ ] When sticky is cleared, remove all focus-specific bias and return to baseline simulation behavior.
- [ ] Ensure drag/pin interactions remain compatible with focus biases.

**Acceptance**:

- [ ] Activating sticky pulls directly linked tables nearer to sticky table.
- [ ] Unrelated tables move farther out.
- [ ] Clearing sticky returns behavior to baseline without artifacts.

---

## 7 — Keep title readability emphasis at distance

**Files**: `src/renderer/TableCard.tsx`, `src/renderer/constants.ts`

- [ ] Validate existing distance-adaptive title scaling against new controls and sticky behavior.
- [ ] Adjust scaling clamp/range if needed so titles remain legible at farther zoom levels.
- [ ] Preserve row/field text proportion so titles remain visually dominant.
- [ ] Confirm note icon placement remains correct with title scaling transform.

**Acceptance**:

- [ ] Titles stay readable at far zoom.
- [ ] Row text remains smaller relative to titles.

---

## 8 — Unit and integration tests

**Files**: `tests/unit/layout/useForceSimulation.test.ts`, `tests/integration/` (add/extend relevant specs), optional renderer-focused tests where practical

- [ ] Add/extend unit tests for sticky focus layout behavior in `useForceSimulation`:
  - [ ] sticky on/off changes force bias configuration.
  - [ ] link distance runtime scalar updates are clamped and applied.
- [ ] Add integration coverage for sticky toggle event flow (table header dbl-click -> scene sticky state).
- [ ] Add integration coverage for connection hold control updates (state and visible model-level effect).
- [ ] Add integration coverage for zoom hold behavior preserving target/direction.

**Acceptance**:

- [ ] `pnpm test:run` passes with new tests.

---

## 9 — Visual verification (mandatory for renderer changes)

- [ ] Start dev server: `pnpm dev`.
- [ ] Run E2E headed: `pnpm test:e2e --headed`.
- [ ] Use Playwright MCP to navigate to `http://localhost:5173` in headed mode and capture screenshots.
- [ ] Verify visually:
  - [ ] sticky border glow is clear and yellow.
  - [ ] sticky toggle off on second double-click works.
  - [ ] linked tables move closer when sticky is active.
  - [ ] unrelated tables shift farther away.
  - [ ] connection `+/-` hold produces visible real-time spacing changes.
  - [ ] zoom `+/-` hold preserves view direction and center.
  - [ ] titles remain legible at far zoom.
- [ ] Save evidence screenshot(s) under `test-evidence/` (e.g. `test-evidence/more-ux-improvements.png`).

---

## 10 — Final quality pass

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test:run`.
- [ ] Run `pnpm test:e2e --headed`.
- [ ] Confirm no regressions in existing features: rearrange mode drag/pin, fly-to, reset view, load-file flow, hover panel.

---

When all tasks are complete the agent should output <promise>DONE</promise>
