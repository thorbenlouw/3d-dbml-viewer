# TODO — Empty-Space Focus Marker for Camera Pivot

Reference: `features/08-empty-space-focus-marker/PRD.md`

---

## 1 — Add focus-marker state model and precedence rules

**Files**: `src/renderer/Scene.tsx`, optional shared types in `src/types/`

- [ ] Add scene state for marker focus position, e.g. `focusMarkerPosition: THREE.Vector3 | null`.
- [ ] Keep focus modes mutually exclusive:
  - [ ] placing marker sets `stickyTableId` to `null`.
  - [ ] making table sticky sets `focusMarkerPosition` to `null`.
- [ ] Keep marker lifecycle ephemeral:
  - [ ] clear marker on schema reload/file change.
  - [ ] do not persist marker anywhere.
- [ ] Update refs/memos (`stickyTableIdRef`, camera controller inputs) so marker and sticky precedence is deterministic.

**Acceptance**:

- [ ] Marker and sticky cannot both be active at once.
- [ ] Reloading schema clears marker state.

---

## 2 — Detect empty-space double-click and resolve world position

**Files**: `src/renderer/Scene.tsx`, optional helper in `src/renderer/interaction.ts`

- [ ] Implement empty-space double-click handling on the scene/canvas interaction layer.
- [ ] Ensure double-clicks on tables/headers/rows/marker are excluded from empty-space placement.
- [ ] Convert click/raycast hit into a stable world-space position for marker placement.
- [ ] Decide and document placement surface logic (existing world plane or camera-target depth projection) and keep behavior deterministic.

**Acceptance**:

- [ ] Double-clicking empty space places marker at expected 3D position.
- [ ] Double-clicking table content does not trigger empty-space placement.

---

## 3 — Add marker renderer component and remove interaction

**Files**: `src/renderer/FocusMarker.tsx` (new), `src/renderer/Scene.tsx`, optional `src/renderer/constants.ts`

- [ ] Create a dedicated `FocusMarker` component.
- [ ] Render a small yellow target-style marker with clear visibility on current scene background.
- [ ] Add `onDoubleClick` on marker geometry to remove marker.
- [ ] Keep marker footprint small so it does not obscure table content.
- [ ] Add any constants needed (size/color/opacity/depth offset) to `constants.ts`.

**Acceptance**:

- [ ] Marker is visible and recognizably target-like.
- [ ] Double-clicking marker removes it.

---

## 4 — Integrate marker mode into camera controller

**Files**: `src/renderer/Scene.tsx` (`CameraController` and tween plumbing)

- [ ] Extend camera controller props/state to accept marker target position.
- [ ] While marker exists, keep orbit target anchored to marker position (sticky-like pivot behavior).
- [ ] Ensure marker behavior coexists with existing tween logic (settle tween/reset tween/sticky focus tween) without jitter.
- [ ] Define precedence in controller updates: active tween, marker mode, sticky mode, baseline.
- [ ] Ensure zoom `+/-` controls continue to adjust camera distance around the active target (marker when present).

**Acceptance**:

- [ ] With marker active, orbit rotates around marker.
- [ ] Camera movement remains smooth (no jerky target snapping loops).

---

## 5 — Wire sticky-table interactions to clear marker

**Files**: `src/renderer/Scene.tsx`, `src/renderer/TableCard.tsx` (if callback contract needs adjustment)

- [ ] Update sticky-table activation flow so it removes any active marker before setting sticky table.
- [ ] Keep existing sticky toggle-off behavior unchanged for same-table double-click.
- [ ] Ensure marker placement always clears sticky before marker activation.

**Acceptance**:

- [ ] Sticky activation always removes marker.
- [ ] Marker placement always removes sticky.

---

## 6 — Reset view and mode transitions

**Files**: `src/renderer/Scene.tsx`

- [ ] Verify `Reset View` behavior when marker is active:
  - [ ] either preserve marker-centric target with current offset, or
  - [ ] document and implement intended reset interaction per current UX model.
- [ ] Ensure clearing marker cleanly returns to free movement baseline (no stale refs).
- [ ] Ensure switching marker <-> sticky during active camera tween does not leave inconsistent target state.

**Acceptance**:

- [ ] Reset works predictably in marker mode.
- [ ] Clearing marker fully restores baseline target behavior.

---

## 7 — Tests: unit/integration coverage

**Files**: add/extend tests under `tests/unit/` and `tests/integration/`

- [ ] Add tests for focus mode precedence logic (marker vs sticky) at scene/state boundary.
- [ ] Add tests for marker placement/removal flow:
  - [ ] empty-space double-click places marker.
  - [ ] marker double-click removes marker.
- [ ] Add tests to verify sticky activation clears marker and marker placement clears sticky.
- [ ] Add regression tests for existing sticky behavior and zoom controls while marker mode exists.

**Acceptance**:

- [ ] `pnpm test:run` passes with new coverage.

---

## 8 — E2E and visual verification (mandatory)

**Files**: `tests/e2e/interactiveLayout.spec.ts` or new e2e spec, `test-evidence/`

- [ ] Add/extend Playwright test coverage for marker interactions:
  - [ ] place marker via empty-space double-click.
  - [ ] remove marker via marker double-click.
  - [ ] verify sticky/marker override both directions.
- [ ] Run headed verification: `pnpm test:e2e --headed`.
- [ ] Capture visual evidence screenshot(s) showing marker visible and camera pivot behavior under `test-evidence/`.

**Acceptance**:

- [ ] E2E tests pass.
- [ ] Evidence screenshot is saved.

---

## 9 — Final quality pass

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test:run`.
- [ ] Run `pnpm test:e2e --headed`.
- [ ] Validate no regressions in:
  - [ ] sticky table focus/toggle.
  - [ ] reset view.
  - [ ] zoom and connection hold controls.
  - [ ] rearrange mode drag/pin interactions.
  - [ ] load-file and hover-note interactions.

---

When all tasks are complete the agent should output <promise>DONE</promise>
