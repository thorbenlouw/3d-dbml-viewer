# TODO — Feature 21: Hop-Based Transparency for Sticky Tables

## Tasks

- [ ] **BFS utility**: Create `src/layout/hopDistance.ts` with a pure function `computeHopDistances(startId: string, neighbourMap: Map<string, string[]>): Map<string, number>` that runs BFS from the sticky table and returns hop distances for all reachable tables (`Infinity` for disconnected tables)
- [ ] **BFS unit tests**: Write unit tests in `tests/unit/layout/hopDistance.test.ts` covering: single table (hop 0); direct neighbours (hop 1); multi-hop chains; disconnected tables return Infinity; empty graph; cyclic graphs
- [ ] **Constants**: Add hop opacity constants to `src/renderer/constants.ts`: `HOP_OPACITY_0`, `HOP_OPACITY_1` (0.95), `HOP_OPACITY_2` (0.50), `HOP_OPACITY_FAR` (0.10), `HOP_OPACITY_LERP_SPEED` (0.08)
- [ ] **Simulation integration**: In `src/layout/useForceSimulation.ts`, expose hop distances (ref or return value) computed from `neighbourMap` when `stickyTableId` changes; return `null` when no sticky table is active
- [ ] **Scene wiring**: In `src/renderer/Scene.tsx`, pass a `hopDistance: number | null` prop to each `TableCard` based on the hop distance map; pass `null` when no sticky table is active
- [ ] **TableCard opacity**: In `src/renderer/TableCard.tsx`, extend the `useFrame()` opacity logic to compute `hopOpacity` from the hop distance prop and combine with distance-based opacity via `min(distanceOpacity, hopOpacity)`; lerp toward target for smooth transitions
- [ ] **Connection line opacity**: In `src/renderer/RelationshipLink3D.tsx`, accept hop distances for both endpoints; compute line opacity as `min(endpointA_hopOpacity, endpointB_hopOpacity)` instead of hardcoded 0.8; lerp for smooth transitions
- [ ] **Quality gates**: `pnpm lint`, `pnpm typecheck`, `pnpm test:run` all pass
- [ ] **Visual verification**: Ask user to run `pnpm test:e2e --headed` and visually confirm: sticky table + neighbours opaque, 2-hop tables faded, 3+ hop tables nearly invisible, smooth transitions on activate/deactivate

---

When all tasks are complete the agent should output <promise>DONE</promise>.
