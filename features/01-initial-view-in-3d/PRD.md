# PRD — Initial View in 3D

| Field            | Value                    |
| ---------------- | ------------------------ |
| **Feature**      | Initial View in 3D       |
| **Status**       | Draft                    |
| **Author**       | —                        |
| **Last updated** | 2026-03-04               |
| **Depends on**   | Initial Project Scaffold |

---

## 1. Problem Statement

The project scaffold exists but renders nothing useful. Engineers and stakeholders need to see the core product idea — a DBML schema laid out and navigable in 3D — before any interaction or field-level detail work begins.

This feature delivers the first working 3D scene: all tables from a hard-coded DBML schema are positioned in 3D space using a force-directed layout, rendered as readable, billboarded boxes, and explorable via camera orbit. A single HUD button resets the view to a comfortable overview.

---

## 2. Goals

- Parse a hard-coded DBML file and render all tables as named 3D boxes in the browser.
- Use a force-directed layout (d3-force-3d) to position tables so they are spread out, minimising overlap and keeping related tables (those sharing a reference) closer together.
- Boxes billboard so their forward face always points toward the camera — table names remain legible at any camera angle.
- Boxes are semi-transparent at distance and become more solid as the camera approaches, preserving depth cues while ensuring close-up readability.
- A HUD button resets the camera to a zoomed-out, centred overview that fits all boxes on screen.
- The scene and UI follow the project's `VISUAL_GUIDELINES.md`.

---

## 3. Non-Goals (this feature)

- No file upload, file picker, or runtime DBML editing UI. The schema is hard-coded.
- No field-level detail inside boxes (column names, types, constraints).
- No rendered relationship edges between tables.
- No click-to-focus or selection behaviour on individual boxes.
- No search, filter, or highlight functionality.
- No layout persistence or URL state.

---

## 4. Hard-coded DBML Source

The application renders the following DBML schema and no other. This will be replaced by dynamic loading in a future PRD.

```dbml
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table follows {
  following_user_id integer
  followed_user_id integer
  created_at timestamp
}

Table users {
  id integer [primary key]
  username varchar
  role varchar
  created_at timestamp
}

Table posts {
  id integer [primary key]
  title varchar
  body text [note: 'Content of the post']
  user_id integer [not null]
  status varchar
  created_at timestamp
}

Ref user_posts: posts.user_id > users.id // many-to-one

Ref: users.id < follows.following_user_id

Ref: users.id < follows.followed_user_id
```

The `Records` blocks in the source are valid DBML but carry no structural schema meaning; they must not affect the table list or layout. The parser layer should discard them gracefully.

---

## 5. Success Criteria

| #   | Criterion                                                                                                                  | How to verify                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `pnpm dev` opens the browser and the 3D scene is visible with all 3 tables rendered as boxes (`users`, `posts`, `follows`) | Manual                                                           |
| 2   | Each box displays the table name in white Lexend text, legible against the Curious Blue fill                               | Manual                                                           |
| 3   | Boxes are positioned so no two boxes overlap significantly; layout settles within a few seconds of load                    | Manual                                                           |
| 4   | Camera can be freely orbited (mouse drag), panned (right-click drag), and zoomed (scroll wheel)                            | Manual                                                           |
| 5   | At any camera angle, each box face is oriented toward the camera (billboarding)                                            | Manual — orbit 360° and confirm text is always facing the viewer |
| 6   | Boxes far from the camera are visually semi-transparent; approaching a box causes it to become more opaque                 | Manual — orbit close to a box                                    |
| 7   | Clicking the reset-view button smoothly tweens the camera back to a position where all boxes are visible and centred       | Manual                                                           |
| 8   | The reset button is keyboard-focusable and activatable via Enter/Space                                                     | Manual — Tab to button, press Enter                              |
| 9   | `pnpm lint`, `pnpm typecheck`, `pnpm test:run` all pass                                                                    | CI                                                               |
| 10  | No console errors or Three.js warnings appear during normal scene interaction                                              | Manual — open DevTools                                           |

---

## 6. Scope

### 6.1 Parser Integration

Use the existing `@dbml/core` package to parse the hard-coded DBML string. The parser layer (`src/parser/`) must:

- Accept a raw DBML string.
- Return a typed list of tables: `{ id: string; name: string }[]`.
- Expose refs as pairs of table IDs for use by the layout engine: `{ sourceId: string; targetId: string }[]`.
- Ignore `Records` blocks (they are not structural schema elements).
- Throw a typed `ParseError` for malformed DBML.

### 6.2 Layout Engine

Use `d3-force-3d` to run a force-directed simulation. The layout layer (`src/layout/`) must:

- Accept the node list and ref list from the parser output.
- Apply:
  - **Many-body repulsion** — nodes push each other apart to prevent overlap.
  - **Link force** — nodes connected by a ref are attracted toward each other.
  - **Centering force** — keeps the overall cluster centred at the origin.
- Produce stable, non-overlapping positions: `{ id: string; x: number; y: number; z: number }[]`.
- Run the simulation to completion synchronously on load (tick to alpha ≤ threshold). The schema is small enough that a Web Worker is not required for this feature.
- Use a fixed random seed so the layout is deterministic across page loads (prevents jarring re-arrangement on refresh).

### 6.3 Renderer — Scene

All scene components live in `src/renderer/`. The scene must:

- Use React Three Fiber (`<Canvas>`) as the WebGL context.
- Set the scene background to white (`#FFFFFF`) matching the application shell.
- Render one `<TableBox>` component per table node.

### 6.4 Renderer — TableBox Component

Each `<TableBox>` is a Three.js `<mesh>` with:

- **Geometry**: `BoxGeometry` sized to comfortably contain the table name label (approximately `2 × 0.6 × 0.1` world units as a starting point; adjust so text fits without clipping).
- **Material**: `MeshBasicMaterial` (no lighting required) in Curious Blue (`#1C95D3`), with `transparent: true` and `opacity` driven by camera proximity (see §6.7).
- **Billboard behaviour**: The mesh rotates each frame so its local +Z axis points toward the camera. Use `useFrame` to apply this rotation. The mesh must not inherit scene rotation — it should rotate independently.
- **Label**: Rendered using Drei `<Text>` (or `<Text3D>`) positioned at the box centre, using Lexend font, white (`#FFFFFF`) colour, font size scaled to fit within the box face. The text component must sit on top of the box face (slightly offset in +Z) so it is not obscured by the box geometry.

### 6.5 Renderer — Box Edge Lines

To keep the box silhouette legible at all distances and opacity levels, render the box edges as lines:

- Use `<lineSegments>` or Drei `<Edges>` with `EdgesGeometry` derived from the box geometry.
- Edge colour: Curious Blue `#1C95D3`, fully opaque at all times.
- Edge line width: 1–2 px (hardware line width; note WebGL line width >1 is not universally supported — use a thin tube or `linewidth` via Drei `<Line>` if hairlines look too faint).

### 6.6 Camera & Controls

- Use Drei `<OrbitControls>` with `enableDamping: true` for smooth orbiting.
- Initial camera position: computed after layout to frame all boxes with comfortable padding (use Three.js `Box3` / `Sphere` bounding analysis).
- `minDistance` / `maxDistance` set to prevent clipping into boxes or zooming so far out that boxes disappear.

### 6.7 Depth-based Opacity

Each `<TableBox>` reads the camera's world position each frame (via `useThree`) and computes the Euclidean distance to its own world position. The fill opacity is mapped:

| Distance (world units)    | Opacity              |
| ------------------------- | -------------------- |
| ≥ far threshold (e.g. 15) | 0.15                 |
| ≤ near threshold (e.g. 4) | 0.90                 |
| Between                   | Linear interpolation |

Thresholds should be tunable constants, not magic numbers inline. Expose them from a `src/renderer/constants.ts` file.

### 6.8 Reset View Button

A HUD button sits outside the `<Canvas>` in the React DOM (not a Three.js object). When clicked:

1. Computes the bounding sphere of all table node positions.
2. Tweens the camera position and target to a top-angled overview that contains the bounding sphere within the viewport.
3. Tween duration: 600 ms, ease-in-out.
4. Uses a lightweight tween (e.g. a `useFrame`-driven lerp, or `@react-spring/three` — no heavy animation library to be added if avoidable).

Button visual specification (per `VISUAL_GUIDELINES.md`):

- Curious Blue fill, White label, Lexend font.
- Positioned as a fixed overlay in the bottom-right corner of the canvas, `16px` from the edges.
- Label: "Reset View".
- Hover: slightly darker blue (`#1580B8`).
- Focus ring: `2px solid #1C95D3`, 2 px offset.
- `aria-label="Reset camera to overview"`.

### 6.9 Application Shell

The Vite entry point (`src/main.tsx` → `src/App.tsx`) mounts the scene. The shell must:

- Fill the full viewport (`100dvh`, `100dvw`), no scrollbars.
- Display the `<Canvas>` occupying the full area.
- Overlay the Reset View button over the canvas using `position: absolute`.
- Apply Lexend as the base font for the page via Tailwind config or a global CSS rule.

---

## 7. File Structure

New and modified files expected for this feature:

```
src/
├── parser/
│   ├── index.ts             # parseDatabaseSchema(dbml: string) → ParsedSchema
│   └── index.test.ts
├── layout/
│   ├── index.ts             # computeLayout(schema: ParsedSchema) → LayoutNode[]
│   └── index.test.ts
├── renderer/
│   ├── Scene.tsx            # <Canvas> + lights + <OrbitControls>
│   ├── TableBox.tsx         # Individual table box + billboard + label
│   ├── ResetViewButton.tsx  # HUD overlay button
│   └── constants.ts         # OPACITY_NEAR, OPACITY_FAR, etc.
├── types/
│   └── index.ts             # ParsedSchema, LayoutNode, shared types
├── App.tsx                  # Wires parser → layout → renderer
└── main.tsx                 # React DOM entry (unchanged)

features/
└── initial-view-in-3d/
    └── PRD.md               # this file
```

---

## 8. Dependencies

All packages listed below should already be present in the scaffold or are direct additions:

| Package              | Already in scaffold? | Notes                      |
| -------------------- | -------------------- | -------------------------- |
| `@dbml/core`         | Yes                  | Parser                     |
| `d3-force-3d`        | Yes                  | Layout                     |
| `@react-three/fiber` | Yes                  | Canvas                     |
| `@react-three/drei`  | Yes                  | OrbitControls, Text, Edges |
| `three`              | Yes                  | Underlying WebGL engine    |
| `tailwindcss`        | Yes                  | HUD button styling         |

No new runtime dependencies should be required.

---

## 9. Testing

### Unit tests

| File                       | What to test                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/parser/index.test.ts` | Returns correct table names and ref pairs from the hard-coded DBML. Throws `ParseError` on invalid input. Ignores `Records` blocks.                                                                                                        |
| `src/layout/index.test.ts` | Produces one node per table with numeric x/y/z. Nodes for ref-connected tables are closer than nodes without a ref (relative distance assertion). Deterministic output given same seed. No overlapping nodes (minimum distance assertion). |

### Integration tests

- `tests/integration/pipeline.test.ts` — run the full `parseDatabaseSchema → computeLayout` pipeline on the hard-coded DBML and assert that 3 layout nodes are returned with valid coordinates.

### E2E tests

- `tests/visual/scene.spec.ts` — Playwright loads the app and asserts:
  - The `<canvas>` element is present and has non-zero dimensions.
  - No uncaught JavaScript errors during load.
  - (Optional) Screenshot snapshot of the settled scene for visual regression.

---

## 10. Risks & Mitigations

| Risk                                                                                 | Likelihood | Impact | Mitigation                                                                                        |
| ------------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| `d3-force-3d` produces overlapping nodes for the small 3-node graph                  | Low        | Medium | Tune repulsion strength; add a minimum-distance collision force                                   |
| Billboarding causes label to flicker at certain camera angles (gimbal-lock-adjacent) | Low        | Low    | Use `quaternion.copy(camera.quaternion)` rather than `lookAt` to match camera orientation exactly |
| Drei `<Text>` Lexend font fails to load (CORS / missing font file)                   | Medium     | Medium | Bundle the Lexend woff2 in `public/fonts/` rather than fetching from Google Fonts at runtime      |
| Depth-based opacity lerp causes visible "pop" between frames                         | Low        | Low    | Clamp delta per frame to max 0.05 to smooth rapid changes                                         |
| Three.js `linewidth > 1` not supported on all GPUs                                   | Medium     | Low    | Fall back to `linewidth: 1` (hairline); the edge stroke purpose is silhouette, not decoration     |

---

## 11. Acceptance Checklist

- [ ] `pnpm dev` — browser shows 3 table boxes (`users`, `posts`, `follows`) in a 3D scene.
- [ ] Orbit the camera 360° — table names remain readable at all angles.
- [ ] Zoom in close to one box — it becomes visibly more opaque.
- [ ] Zoom back out — boxes become semi-transparent again.
- [ ] Click "Reset View" — camera smoothly returns to the overview position.
- [ ] Tab to the Reset View button and press Enter — camera resets.
- [ ] Open browser DevTools — no console errors or Three.js warnings.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm test:run` exits 0 with parser and layout unit tests passing.
