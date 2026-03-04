# TODO — Initial View in 3D

Work through the tasks in order. Each section builds on the previous one.
Run `pnpm lint && pnpm typecheck && pnpm test:run` after completing each section before moving on.

---

## 1. Shared Types

- [ ] Create `src/types/index.ts` with the following exported types:
  - `ParsedTable`: `{ id: string; name: string }`
  - `ParsedRef`: `{ sourceId: string; targetId: string }`
  - `ParsedSchema`: `{ tables: ParsedTable[]; refs: ParsedRef[] }`
  - `LayoutNode`: `{ id: string; name: string; x: number; y: number; z: number }`

---

## 2. Parser Layer

- [ ] Replace the placeholder `src/parser/index.ts` with a real implementation:
  - Export `parseDatabaseSchema(dbml: string): ParsedSchema`
  - Use `@dbml/core` to parse the DBML string
  - Map each `Table` in the parsed output to a `ParsedTable` (use the table name as both `id` and `name`)
  - Map each `Ref` to a `ParsedRef` using the table names of the endpoints as IDs
  - Ignore `Records` blocks (they are not returned by `@dbml/core` as tables)
  - On parse failure, throw a typed `ParseError` (define this class in `src/parser/index.ts`)

- [ ] Create `src/parser/index.test.ts`:
  - Test that the hard-coded DBML returns exactly 3 tables: `users`, `posts`, `follows`
  - Test that refs are returned: `posts → users`, `users → follows` (two refs from users to follows)
  - Test that malformed DBML throws `ParseError`
  - Test that `Records` blocks do not produce extra tables

---

## 3. Layout Layer

- [ ] Replace the placeholder `src/layout/index.ts` with a real implementation:
  - Export `computeLayout(schema: ParsedSchema): LayoutNode[]`
  - Use `d3-force-3d` to run a force simulation with:
    - Many-body repulsion force (`forceManyBody`) with a negative strength to push nodes apart
    - Link force (`forceLink`) using the refs to attract connected nodes
    - Centering force (`forceCenter3d` or `forceX`/`forceY`/`forceZ`) to keep the cluster near the origin
  - Tick the simulation to completion (run until `alpha` drops below `0.001` or max 300 ticks)
  - Use a fixed seed for reproducible layout (initialise node positions deterministically — e.g., evenly spaced on a sphere — rather than relying on `Math.random`)
  - Return `LayoutNode[]` with the final `x`, `y`, `z` of each node

- [ ] Create `src/layout/index.test.ts`:
  - Test that 3 nodes are returned for the 3-table schema
  - Test that all nodes have finite numeric `x`, `y`, `z`
  - Test that the layout is deterministic (calling `computeLayout` twice with the same input returns the same positions)
  - Test that the two nodes connected by a ref are closer together than the minimum possible distance between unconnected nodes (relative distance assertion — use the `users`/`posts` ref as the connected pair and compare to a hypothetical disconnected pair if possible, or just assert the layout is non-degenerate with all inter-node distances > 0.5 world units)

---

## 4. Renderer Constants

- [ ] Create `src/renderer/constants.ts` with:
  - `OPACITY_NEAR = 0.90` — fill opacity when camera is at or closer than `DISTANCE_NEAR`
  - `OPACITY_FAR = 0.15` — fill opacity when camera is at or farther than `DISTANCE_FAR`
  - `DISTANCE_NEAR = 4` — world units
  - `DISTANCE_FAR = 15` — world units
  - `RESET_TWEEN_DURATION_MS = 600`
  - `BOX_WIDTH = 2`
  - `BOX_HEIGHT = 0.6`
  - `BOX_DEPTH = 0.1`

---

## 5. Fonts

- [ ] Download the Lexend Regular and Medium woff2 font files and place them in `public/fonts/`:
  - `public/fonts/Lexend-Regular.woff2`
  - `public/fonts/Lexend-Medium.woff2`
  - Source: Google Fonts static download (https://fonts.google.com/specimen/Lexend)
- [ ] Add a `@font-face` declaration in `src/index.css` (or equivalent global CSS) loading Lexend from the local `/fonts/` path
- [ ] Set `font-family: 'Lexend', 'Helvetica Neue', Arial, sans-serif` as the base body font in the global CSS / Tailwind config

---

## 6. TableBox Component

- [ ] Create `src/renderer/TableBox.tsx`:
  - Props: `node: LayoutNode`
  - Renders a `<mesh>` at `[node.x, node.y, node.z]`
  - Geometry: `<boxGeometry args={[BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH]}>`
  - Material: `<meshBasicMaterial color="#1C95D3" transparent opacity={opacity} />`
  - `opacity` is computed each frame in `useFrame` by:
    1. Getting `camera.position` from `useThree`
    2. Computing Euclidean distance from the camera to the mesh world position
    3. Linearly interpolating between `OPACITY_FAR` and `OPACITY_NEAR` using `DISTANCE_FAR` and `DISTANCE_NEAR` as the range, clamped to `[0, 1]`
  - **Billboarding**: in `useFrame`, set `meshRef.current.quaternion.copy(camera.quaternion)` so the face always points toward the camera
  - **Edge lines**: render `<lineSegments>` using `EdgesGeometry` derived from the box geometry, with a `<lineBasicMaterial color="#1C95D3" />` at full opacity. Use `useMemo` to compute the edges geometry once.
  - **Label**: render a Drei `<Text>` child:
    - `font="/fonts/Lexend-Medium.woff2"`
    - `color="#FFFFFF"`
    - `fontSize={0.18}` (adjust so the name fits within `BOX_WIDTH`)
    - `position={[0, 0, BOX_DEPTH / 2 + 0.01]}` (just in front of the box face)
    - `anchorX="center"`, `anchorY="middle"`
    - `text={node.name}`
    - `maxWidth={BOX_WIDTH - 0.2}` to prevent overflow

---

## 7. ResetViewButton Component

- [ ] Create `src/renderer/ResetViewButton.tsx`:
  - Props: `onClick: () => void`
  - Renders a `<button>` in the DOM (not a Three.js object)
  - Styles (Tailwind or inline — use Tailwind):
    - `position: fixed`, bottom-right corner: `bottom-4 right-4`
    - Background: Curious Blue (`bg-[#1C95D3]`), White text (`text-white`)
    - Font: Lexend (`font-[Lexend]` or via global base style)
    - Padding: `px-4 py-2`, rounded: `rounded-md`
    - Hover: `hover:bg-[#1580B8]`
    - Focus ring: `focus:outline-none focus:ring-2 focus:ring-[#1C95D3] focus:ring-offset-2`
  - Label: "Reset View"
  - `aria-label="Reset camera to overview"`

---

## 8. Scene Component

- [ ] Create `src/renderer/Scene.tsx`:
  - Props: `nodes: LayoutNode[]`
  - Renders a React Three Fiber `<Canvas>`:
    - `style={{ width: '100%', height: '100%' }}`
    - Background color set via `<color attach="background" args={['#FFFFFF']} />`
  - Inside the canvas:
    - `<OrbitControls enableDamping dampingFactor={0.1} />` from Drei
    - One `<TableBox>` per node in `nodes`
  - Manages the reset-view tween:
    - Expose a `resetView` imperative handle (via `useImperativeHandle` + `forwardRef`) OR manage the camera position internally with a state flag triggered by a prop
    - On reset, compute the bounding sphere of all node positions, then tween the camera to a position that frames the sphere with padding
    - Tween implemented as a `useFrame` lerp — set a target camera position and lerp toward it each frame by a fixed step derived from `RESET_TWEEN_DURATION_MS`, stopping when within epsilon of the target
  - Mount the `<ResetViewButton>` outside the canvas (as a sibling in the DOM, absolutely positioned over the canvas) — wire its `onClick` to trigger the camera tween

---

## 9. App Entry Point

- [ ] Update `src/App.tsx`:
  - On mount, call `parseDatabaseSchema` with the hard-coded DBML string (define the DBML as a constant in `src/App.tsx` or in a separate `src/data/schema.dbml.ts` string constant)
  - Call `computeLayout` on the parsed schema
  - Pass the resulting `LayoutNode[]` to `<Scene>`
  - Handle `ParseError` gracefully (log to console; render a minimal error message in the DOM — this path should never be hit with the hard-coded schema)
  - Apply full-viewport layout: `width: 100dvw; height: 100dvh; overflow: hidden; position: relative`

---

## 10. Integration Test

- [ ] Create `tests/integration/pipeline.test.ts`:
  - Import `parseDatabaseSchema` and `computeLayout`
  - Run the full pipeline on the hard-coded DBML string
  - Assert: exactly 3 `LayoutNode` objects returned
  - Assert: each node has `id`, `name`, finite `x`, `y`, `z`
  - Assert: node names are `users`, `posts`, `follows` (order-insensitive)

---

## 11. E2E Test

- [ ] Create `tests/visual/scene.spec.ts` (Playwright):
  - Navigate to `http://localhost:5173`
  - Assert the `<canvas>` element is present and has `width > 0` and `height > 0`
  - Assert no uncaught page errors (`page.on('pageerror', ...)`)
  - Assert the Reset View button is present in the DOM with `aria-label="Reset camera to overview"`
  - Click the Reset View button and assert no errors are thrown

---

## 12. Final Checks

- [ ] Run `pnpm lint` — must exit 0
- [ ] Run `pnpm typecheck` — must exit 0
- [ ] Run `pnpm test:run` — all unit and integration tests pass
- [ ] Run `pnpm dev` and manually verify the full acceptance checklist from the PRD §11:
  - [ ] 3 table boxes visible (`users`, `posts`, `follows`)
  - [ ] Table names readable at all camera angles (billboard check)
  - [ ] Boxes become more opaque when zoomed in
  - [ ] Reset View button smoothly resets the camera
  - [ ] Reset View button works via keyboard (Tab + Enter)
  - [ ] No console errors in DevTools

---

When all tasks above are complete and all checks pass, output: <promise>DONE</promise>
