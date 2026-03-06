# TODO: Remove Rearrange Mode

## Tasks

### 1. Remove the mode toggle button from `Scene.tsx`

Delete the `<button>` element (and its inline styles) that toggles between
Navigate Mode and Re-arrange Mode. This is the `button` rendered at the bottom
of the `Scene` return JSX with `aria-label` containing "Switch to Navigate mode"
/ "Switch to Re-arrange mode".

### 2. Remove `isRearrangeMode` state and related logic from `Scene.tsx`

- Delete the `useState(false)` for `isRearrangeMode`.
- Remove the `setHoverContext(null)` side-effect that was triggered when
  entering Rearrange Mode (inside the toggle button's `onClick`).
- Change `SceneInteractionLayer`'s `enabled` prop from `{!isRearrangeMode}` to
  `{true}` (or simply `enabled`).

### 3. Remove drag handler wiring from `Scene.tsx`

Delete the three drag callbacks that were only used in Rearrange Mode:

- `handleDragStart` (called `setPin` + disabled OrbitControls)
- `handleDragMove` (called `nudge`)
- `handleDragEnd` (called `setPin` + re-enabled OrbitControls)

Remove the `useDragCard` import and any remaining imports that become unused
after this deletion (e.g. `nudge` from `useForceSimulation` if it is no longer
referenced).

### 4. Simplify `DraggableTableCard` in `Scene.tsx`

- Remove the `isRearrangeMode` prop from the `DraggableTableCardProps` interface
  and from the component signature.
- Remove the `useDragCard` call and `dragHandlers` local variable.
- Change the `TableCard` render to always pass `dragHandlers={undefined}` (or
  simply omit the prop) and always pass `onHeaderDoubleClick={onHeaderDoubleClick}`.
- Remove the `onDragStart`, `onDragMove`, `onDragEnd` props from
  `DraggableTableCardProps` if they are no longer needed.
- Update every call-site of `DraggableTableCard` in the render loop accordingly.

### 5. Clean up `TableCard.tsx`

- If the `dragHandlers` prop on `TableCard` is now always `undefined`, assess
  whether the prop and the drag-pointer-event wiring inside `TableCard` can be
  removed entirely.
- Remove the `DragHandlers` interface and any drag-specific pointer handler
  bindings from `TableCard` if they are no longer reachable.

### 6. Remove or retain `useDragCard.ts`

If `useDragCard` is no longer called anywhere after the above changes, delete
`src/renderer/useDragCard.ts` and its test file (if one exists under
`tests/unit/`).

### 7. Add navigation help message

Add a fixed, full-width text bar at the very bottom of the scene root `<div>`
in `Scene.tsx` containing the string:

> Double-click a Table or point in space to set and remove a fixed marker to rotate around

Style it to be unobtrusive: small font (e.g. `0.75rem`), low-opacity, centred,
using the existing `PANEL_TEXT_COLOR` / `PANEL_BG_COLOR` tokens so it blends
with the rest of the HUD. Ensure it sits below (or at the same z-index as) the
existing controls and does not overlap interactive buttons.

### 8. Verify no orphaned imports or dead code remain

Run `pnpm lint` and `pnpm typecheck`. Fix any reported unused-import or
type errors introduced by the deletions.

### 9. Run unit and integration tests

Run `pnpm test:run`. Fix any test that was asserting on Rearrange Mode behaviour
(button presence, aria-labels, mode state). Update E2E specs in
`tests/e2e/` if they reference the toggle button.

### 10. Visual verification via Playwright MCP

- Ensure `pnpm dev` is running.
- Use Playwright MCP `browser_navigate` + `browser_screenshot` to open
  `http://localhost:5173`.
- Confirm the toggle button is absent, the help line is visible at the bottom,
  and the scene renders correctly.
- Save the screenshot to `test-evidence/remove-rearrange-mode.png`.

---

When all tasks above are complete, output <promise>DONE</promise>.
