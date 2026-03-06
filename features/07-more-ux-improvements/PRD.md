# PRD — More UX Improvements: Sticky Focus, Controls, and Context-Aware Layout

## Problem

Large schemas are still hard to inspect efficiently:

1. Users can fly to a table, but there is no persistent "sticky focus" mode.
2. There is no quick control to tighten/loosen layout connectivity at runtime.
3. There is no simple zoom-in/zoom-out hold control that preserves current view direction and center.
4. Distant table titles can become hard to read.
5. Focusing one table does not reorganize nearby related tables for context-first exploration.

## Goals

1. **Sticky table focus toggle**:
   - Double-click table title once to make it the sticky center.
   - Double-click same title again to release sticky center.
   - Sticky table is visually obvious via glowing yellow border.

2. **Connection +/- hold control**:
   - Add a UI control that adjusts force-link distance while pressed/held.
   - Users can pack tables tighter or spread them looser from default.

3. **Zoom +/- hold control**:
   - Add a UI control that continuously zooms in/out while pressed/held.
   - Keep current camera target and direction stable (pure distance change).

4. **Distance-adaptive title readability**:
   - Ensure table titles become relatively larger with distance to remain legible.
   - Field/column text stays proportionally smaller than titles.

5. **Context-aware focus layout**:
   - When a table becomes sticky, directly linked tables move nearer (preferably same plane).
   - Unrelated tables move further away, preserving broader topology context.

## Non-Goals

- Persisting sticky table or control settings across sessions.
- Full manual graph-editing semantics beyond current drag/pin model.
- Replacing OrbitControls with a custom camera system.
- Perfect semantic clustering for all schema shapes in v1.

## Success Criteria

| #   | Criterion                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Double-click on a table title toggles sticky focus state for that table.                                                            |
| 2   | Sticky table shows a clear glowing yellow border while active.                                                                      |
| 3   | Double-clicking the active sticky table clears sticky state and removes glow.                                                       |
| 4   | While sticky state is active, camera center behavior follows sticky table and remains stable during normal orbit/zoom interactions. |
| 5   | Connection `+/-` press-and-hold changes effective link distance in real time, with visible tighter/looser spacing.                  |
| 6   | Zoom `+/-` press-and-hold moves camera closer/farther without changing target or view direction.                                    |
| 7   | Titles remain legible at distant zoom levels and are visually more prominent than field text.                                       |
| 8   | Activating sticky focus causes directly related tables to move closer and unrelated tables to move farther away.                    |
| 9   | Releasing sticky focus returns simulation behavior to baseline mode without visual artifacts.                                       |

## Design Decisions

### Sticky focus state model

- Introduce a single `stickyTableId: string | null` in scene-level state.
- Header double-click behavior:
  - If `stickyTableId !== clickedId` -> set `stickyTableId = clickedId`.
  - If `stickyTableId === clickedId` -> set `stickyTableId = null`.
- Sticky table border glow:
  - Use a distinct yellow emissive/glow style on border material.
  - Keep glow visible even when table opacity is distance-faded.

### Sticky camera behavior

- Sticky mode does not lock user orbit controls.
- It defines the "center of interest":
  - Reset View prioritizes sticky center framing when active.
  - Fly-to can still be used; selecting a different table updates sticky target.

### Connection +/- control (Idea 25)

- Add two holdable buttons: `Connection -` and `Connection +`.
- While held, adjust a live scalar on link distance at fixed cadence.
- Clamp within safe min/max bounds to avoid collapse/explosion.
- On release, keep the final adjusted value until changed again.

### Zoom +/- control (Idea 26)

- Add two holdable buttons: `Zoom -` and `Zoom +`.
- While held, continuously adjust camera distance from current target.
- Preserve target and forward direction; only radius changes.
- Respect min/max distance limits from controls.

### Title readability (Idea 27)

- Keep distance-adaptive title scaling as the core approach.
- Ensure title emphasis relative to row text remains clear at far zoom.
- Note/icon placement rules are independent from title scaling transforms.

### Focus-aware layout (Idea 28)

- When sticky table is set:
  - Increase attractive bias between sticky table and directly linked neighbors.
  - Nudge linked neighbors toward a local ring/plane around sticky table.
  - Apply mild repulsive bias for unlinked nodes away from sticky neighborhood.
- When sticky table is cleared:
  - Remove focus biases and return to baseline simulation parameters.

### Toggle-off sticky focus (Idea 29)

- Same interaction as sticky activation: double-click title again to release.
- Visual glow is the source of truth for active sticky state.

## Architecture

```
features/more-ux-improvements/PRD.md

src/renderer/
  Scene.tsx                 // stickyTableId state, controls, interaction wiring
  TableCard.tsx             // sticky highlight rendering, dbl-click toggle signal
  constants.ts              // bounds/speeds for connection + zoom controls
  (optional) CameraControls.tsx // hold-to-zoom/connection control logic

src/layout/
  useForceSimulation.ts     // runtime link-distance parameter + focus bias hooks
```

## Acceptance Tests (Behavioral)

1. Double-click table A title: table A gains glowing yellow border and becomes sticky center.
2. Double-click table A title again: glow disappears and sticky center is cleared.
3. Double-click table B title while A is sticky: A unhighlights, B highlights, sticky center switches to B.
4. Hold `Connection +`: linked tables visibly spread out; release preserves new spacing.
5. Hold `Connection -`: linked tables visibly tighten; no table collapse/overlap explosion.
6. Hold `Zoom +` / `Zoom -`: camera distance changes smoothly while maintaining current target and view direction.
7. With sticky focus active, directly linked tables move closer to sticky table; unrelated tables drift farther.
8. With sticky focus cleared, layout behavior returns toward baseline dynamics.
9. Titles remain legible at far zoom and remain more readable than field rows.

## Source Ideas Included

25. Add a button "connection +/-" (press and hold to adjust) that allows modifying the length of connections setting from the default (pack tables tighter or looser).
26. Add a "Zoom +/-" button (press and hold to adjust) that allows the user to just zoom out into space from their current position, keeping the centre and direction as is.
27. Make table titles get relatively bigger the further away they are, so what a table is stays legible even for distant tables (col font size stays proportionally small though).
28. When a table is brought into focus, the other tables rearrange themselves so that directly linked tables travel to be "nearby" (preferably in the same plane), and unrelated tables move further away.
29. Double-click again on "sticky" table to stop it being the centre of the view. A table that is currently the sticky one should have a glowing visual indicator around the table border.
