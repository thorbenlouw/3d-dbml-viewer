# PRD — UX Polish: Camera Fit, Readable Labels, Tighter Layout, Fly-to Table

## Problem

Five cosmetic UX issues degrade the experience when exploring schemas in the 3D viewer:

1. **Blank initial view** — on startup (or after loading a new file), the camera
   starts at a fixed position that may leave all tables off-screen or too small.
   The user must manually zoom/pan to find the schema.

2. **Reset View doesn't restore overview** — the Reset View button re-computes
   the camera frame from the current node positions, which may have drifted since
   load. Users expect Reset View to return to the same birds-eye view they saw at
   first load, not an arbitrary re-frame.

3. **Table titles unreadable at distance** — the header text is rendered at a
   fixed world-space font size (`TEXT_HEADER_SIZE = 0.14`). When zoomed out to
   see many tables at once, all titles shrink to illegible specks while the card
   bodies are still visible.

4. **Tables spread too far apart** — the default link distance in the
   force simulation (`distance(3)`) places related tables too far apart given
   the typical card dimensions (~2–4 world units wide). Tables in a dense schema
   leave large gaps that make the topology hard to read.

5. **No way to focus a specific table** — users with large schemas must manually
   orbit and zoom to find a table of interest. There is no quick navigation gesture.

## Goals

1. **Auto-fit on load** — after the force layout stabilises following a file load
   or initial startup, the camera animates to a position where all table cards
   are just visible.

2. **Stable Reset View target** — Reset View always returns to the auto-fit frame
   captured at the most recent file load (not a dynamically re-computed frame
   based on current positions).

3. **Distance-adaptive title size** — the table name in a `TableCard` header
   scales with camera distance so that it remains legible at any zoom level.
   Field rows may shrink at distance (they are already handled by opacity); only
   the title needs to grow to compensate.

4. **Tighter default link distance** — reduce the force simulation's default link
   distance so that related tables are adjacent rather than spread apart,
   without causing overlap.

5. **Double-click to fly-to table** — double-clicking a table header (in Navigate
   mode, not Re-arrange mode) triggers a smooth camera tween that centres and
   zooms in to that table, bringing it front-and-centre.

6. **Amendment: fixed note icon placement** — the table note icon remains pinned
   to the top-right corner of the table card header and must not scale, drift, or
   reposition based on title scaling behaviour.

## Non-Goals

- Saving camera position across sessions.
- Per-table zoom level preferences.
- Auto-layout that re-runs when the user resizes the window.
- Changes to the drag/rearrange behaviour introduced in feature 04.

## Success Criteria

| #   | Criterion                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On initial load and after loading a new DBML file, the camera automatically frames all visible table cards with a smooth tween (or on first load, an immediate snap).               |
| 2   | Reset View always returns to the last auto-fit camera frame, not a recomputed one.                                                                                                  |
| 3   | Table header text size increases proportionally to camera distance so titles remain readable when zoomed out to fit 20+ tables on screen.                                           |
| 4   | Default link distance is reduced to a value that keeps related tables close without overlapping (acceptance: no visible overlap in the insurance example schema at default layout). |
| 5   | Double-clicking a table title in Navigate mode triggers a smooth camera tween that positions the camera ~3–4 world units in front of that card, centred on it.                      |
| 6   | Double-click fly-to does not trigger in Re-arrange mode (where double-click already unpins).                                                                                        |
| 7   | All existing unit and integration tests continue to pass.                                                                                                                           |
| 8   | Visual correctness verified with Playwright MCP screenshot.                                                                                                                         |
| 9   | For noted tables, the note icon stays fixed at the card header top-right corner at all zoom levels and title scales.                                                                |

## Design Decisions

### Auto-fit timing

The force simulation runs continuously after load. Node positions shift for the
first few seconds as the layout converges. Fitting immediately would frame a
tight cluster; fitting too late would require a long delay.

**Approach**: compute the auto-fit frame when the simulation's alpha drops below
a "settled" threshold (~0.05). At that point, snapshot `framePoints` and store
them as `settledFrame`. On first load, snap the camera immediately (no tween) to
`settledFrame`. On subsequent file loads, tween over `RESET_TWEEN_DURATION_MS`.
Reset View always tweens to `settledFrame`.

Alternatively, since `computeCameraFrameFromPoints` already adds a 25% margin
(`distance * 1.25`), we can also simply snapshot after a fixed delay (e.g. 1.5 s)
— the positions will have converged enough that any residual drift is imperceptible.

**Chosen approach**: watch alpha in the rAF loop inside `useForceSimulation` and
emit a callback `onSettled(nodes)` once alpha < 0.05. `Scene` listens and stores
the `settledFrame`. On first settled event (no previous frame), snap camera; on
subsequent events (new file), tween.

### Distance-adaptive title size

Three.js `Text` from `@react-three/drei` accepts a `fontSize` prop. We cannot
make this reactive per-frame without adding a `useFrame` call in `TableCard`
(already present for opacity). We will compute the adaptive font size inside the
existing `useFrame` callback by comparing camera distance to
`[DISTANCE_NEAR, DISTANCE_FAR]` and writing to a `textRef`.

However, `Text` from Drei is an HTML/canvas-backed component and updating its
`fontSize` prop causes a re-render. We should instead use a fixed `fontSize` but
apply a **scale transform** on a `<group>` wrapping only the header `<Text>`.
Scaling the `<group>` in `useFrame` avoids a React re-render while changing the
apparent text size from the camera's perspective.

Scale factor: `clamp(1 + k * (dist - DISTANCE_NEAR), 1, MAX_TITLE_SCALE)` where
`k` is tuned so the text reaches `MAX_TITLE_SCALE` (e.g. 2.5×) at `DISTANCE_FAR`.

### Amendment: note icon anchoring

The note icon should not be coupled to title scale transforms. It must be
rendered at a fixed local position in the table card header's top-right corner.
Title text may overlap the icon at extreme scales; this is acceptable.

### Tighter link distance

Current value: `distance(3)`. Typical card width: 2.2–4.3 world units.
A link distance of **1.5** will keep related tables touching or very close at
typical card sizes, with repulsion forces (`strength(-15)`) preventing overlap.
If overlap is still observed with the insurance example (20+ tables), reduce
charge strength or raise link distance slightly.

Target value: `distance(1.5)`.

### Fly-to camera tween

Reuse the existing `CameraTweenState` / `CameraController` infrastructure.

Target position: `tablePosition + cameraForwardNorm * (-flyDistance)` where
`flyDistance = 5` world units and `cameraForwardNorm` is the camera's current
forward direction (so we approach from wherever the user is looking). Target
`target`: the table's world position.

Trigger: `onDoubleClick` on the header hit mesh in `TableCard`, forwarded via
a new `onFlyTo` prop to `Scene`, which computes the tween target and fires it.
Only active when `!isRearrangeMode`.

## Architecture

```
src/
  layout/
    useForceSimulation.ts   ← add onSettled callback; expose alpha
  renderer/
    Scene.tsx               ← store settledFrame; handle onFlyTo; snap/tween on settle
    TableCard.tsx           ← distance-adaptive title scale in useFrame; onFlyTo on header dblclick
    constants.ts            ← add TITLE_SCALE_MAX, TITLE_SCALE_DISTANCE_FACTOR, FLY_TO_DISTANCE
```

## Acceptance Tests (Playwright)

1. Navigate to `http://localhost:5173`. After ~2 s, the camera should have
   auto-fitted to frame all tables — no blank screen, no tables out of view.
2. Orbit the camera away, then click Reset View. Camera returns to the
   auto-fit overview, not the current orbited position.
3. Zoom out until 20+ tables are visible. Table titles should remain legible
   (not tiny specks) even though table bodies are small.
4. On a table with a note, verify the icon remains pinned to the top-right
   header corner while zooming in/out and while title scaling changes.
5. Inspect table spacing — related tables in the insurance schema should be
   visually close, not separated by large gaps.
6. Double-click a table title in Navigate mode. Camera flies to that table,
   centred and close-up.
7. Screenshot saved to `test-evidence/ux-polish.png`.
