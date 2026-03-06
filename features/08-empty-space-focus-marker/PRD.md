# PRD — Empty-Space Focus Marker for Camera Pivot

## Problem

Today, users can set a sticky table as the camera center, but they cannot set an arbitrary point in space as a temporary pivot. This makes it hard to inspect relationship clusters or negative space between tables from a custom anchor point.

## Goals

1. **Place marker on empty-space double-click**:
   - Double-clicking empty canvas space places a visible yellow target marker at that 3D point.

2. **Marker becomes orbit pivot**:
   - While the marker exists, camera orbit/rotation uses marker position as the fixed pivot target.

3. **Remove marker by double-clicking marker**:
   - Double-clicking the marker removes it.
   - On removal, camera returns to normal free movement behavior.

4. **Explicit sticky/marker override semantics**:
   - Placing a marker clears any active sticky table.
   - Making a table sticky clears/removes any active marker.

5. **Ephemeral marker lifecycle**:
   - Marker is never persisted and exists only while actively placed.

## Non-Goals

- Persisting marker positions across reloads/files/sessions.
- Supporting multiple simultaneous markers.
- Adding marker editing/dragging or label metadata in v1.
- Replacing OrbitControls with a custom camera system.

## Success Criteria

| #   | Criterion                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Double-clicking empty space places exactly one yellow focus marker at the clicked world position.              |
| 2   | While marker exists, camera orbit pivot/target remains marker-centered during normal rotate/zoom interactions. |
| 3   | Double-clicking marker removes it and restores free movement behavior.                                         |
| 4   | Placing marker while sticky table is active clears sticky state immediately.                                   |
| 5   | Activating sticky table while marker exists removes marker immediately.                                        |
| 6   | Marker state is reset on schema reload/new file (no persistence).                                              |
| 7   | No regression in existing table interactions (hover, drag mode, sticky toggle, reset view, and zoom controls). |

## Design Decisions

### Interaction model

- Empty-space detection is based on pointer/raycast misses in scene interaction layer.
- Marker placement is triggered only on **double-click** (not single click).
- Marker removal is triggered by **double-click directly on marker geometry**.

### Marker visual design

- Marker appears as a small yellow target-style glyph/mesh (map-pin target feel).
- Marker stays visually legible across typical zoom distances.
- Marker should not obscure table content (small footprint, modest depth).

### Camera behavior

- Marker mode behaves like a temporary sticky pivot:
  - Orbit target follows marker position.
  - Existing zoom controls continue to operate as distance adjustments around current target.
- On marker removal, scene returns to baseline camera target behavior (no marker lock).

### State precedence and lifecycle

- Define mutually exclusive focus modes:
  - `stickyTableId: string | null`
  - `focusMarker: Vector3 | null`
- Precedence rules:
  - Setting marker forces `stickyTableId = null`.
  - Setting sticky table forces `focusMarker = null`.
- Marker is ephemeral:
  - Cleared when dismissed.
  - Cleared on schema/file reload.
  - Not serialized anywhere.

## Architecture

```
features/08-empty-space-focus-marker/PRD.md

src/renderer/
  Scene.tsx                // marker state, dbl-click empty-space handler, precedence rules
  FocusMarker.tsx          // target marker mesh + dbl-click remove interaction
  (optional) interaction.ts // reusable raycast/empty-space detection helpers
```

## Acceptance Tests (Behavioral)

1. Start from free mode, double-click empty space: yellow marker appears at clicked point and camera now pivots around it.
2. With marker active, rotate/zoom: target remains marker-centered and behavior feels stable.
3. Double-click marker: marker disappears and free movement behavior returns.
4. Activate sticky table, then double-click empty space: sticky clears, marker appears, marker mode is active.
5. Place marker, then double-click table header to make sticky: marker is removed and sticky mode is active.
6. Load a different DBML file while marker exists: marker is gone after reload.
7. Existing interactions still work: table hover panel, drag mode, zoom +/- hold, connection +/- hold, and reset view.

## Risks and Mitigations

1. **False empty-space detection**:
   - Risk: double-clicks near transparent hit meshes may be misclassified.
   - Mitigation: centralize raycast filtering rules and treat table hit zones as non-empty.

2. **Control target jitter**:
   - Risk: competing target updates (tween/sticky/marker) can cause jerky movement.
   - Mitigation: define single precedence path in camera controller; marker/sticky mutually exclusive by state.

3. **Visual ambiguity at distance**:
   - Risk: marker too small or too bright can reduce usability.
   - Mitigation: clamp scale/opacity by distance and validate with headed Playwright screenshots.
