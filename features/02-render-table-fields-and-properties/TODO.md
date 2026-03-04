# TODO - Render Table Fields and Properties

Work through tasks in order. Keep changes atomic per section.
After each section, run `pnpm lint && pnpm typecheck && pnpm test:run` before moving on.

---

## 1. Shared Types and Contracts

- [ ] Extend shared schema types in `src/types/` so renderer can consume field-level metadata:
  - Add a column/field type with `name`, `type`, and property flags (`isPrimaryKey`, `isForeignKey`, `isNotNull`, `isUnique`).
  - Ensure parsed table type includes `columns`.
  - Keep refs as table-level relationships for layout/link rendering.
- [ ] Add/adjust exported renderer model types for table cards and 3D links if needed.
- [ ] Ensure all exported functions/components touched by this feature have explicit return types.

---

## 2. Parser: Field and Property Extraction

- [ ] Update `src/parser/index.ts` to map DBML columns into typed field metadata.
- [ ] Derive `isForeignKey` from refs so FK badges can be rendered at row level.
- [ ] Preserve strict error handling (`ParseError`) for malformed DBML.
- [ ] Keep parser as the only DBML-aware layer; renderer must consume parser output only.

- [ ] Add/extend parser unit tests in `src/parser/index.test.ts` to verify:
  - Field names and types are extracted for all hard-coded tables.
  - `PK`, `NN` flags are correctly captured from DBML settings.
  - FK inference from refs marks expected fields (e.g., `posts.user_id`, `follows.*_user_id`).
  - Invalid DBML throws `ParseError`.

---

## 3. Renderer Constants for Card Layout and Links

- [ ] Extend `src/renderer/constants.ts` with explicit constants for:
  - Card metrics (header height, row height, padding, depth, min/max width).
  - Text sizing and row column offsets.
  - Badge spacing and sizing.
  - Link routing knobs (depth lift, endpoint fan-out offset, curve tension/segments).
- [ ] Remove magic numbers from renderer components and reference constants instead.

---

## 4. Table Card Component (Replace Simple Box)

- [ ] Refactor `src/renderer/TableBox.tsx` into table-card rendering (or rename to `TableCard.tsx` and update imports).
- [ ] Render a slim 3D card with non-zero depth and clear header/body sections.
- [ ] Render table name in header and one row per field in body.
- [ ] For each field row render:
  - Left column: field name
  - Middle/right column: type
  - Trailing badges: `PK`, `FK`, `NN`, `UQ` when true
- [ ] Keep card billboarding (`camera.quaternion`) for readability while orbiting.
- [ ] Keep visuals legible on the current dark scene background.
- [ ] Ensure text overflow is handled (clamp/maxWidth/truncation strategy).

---

## 5. 3D Relationship Link Renderer

- [ ] Add a dedicated link renderer component in `src/renderer/` (e.g., `RelationshipLink3D.tsx`).
- [ ] Implement deterministic 3D route generation between source and target card anchors:
  - Use curve or polyline routing through depth (not a flat straight line).
  - Include endpoint fan-out/offset to reduce complete overlap on shared endpoints.
- [ ] Render links with stable color/opacity that remains visible against background and cards.
- [ ] Ensure routing avoids obvious intersection through card centers where practical.

---

## 6. Scene Wiring and Camera Framing

- [ ] Update `src/renderer/Scene.tsx` to render:
  - One table card per node/table
  - One 3D relationship link per ref
- [ ] Ensure initial camera frame includes full extents of cards and links.
- [ ] Keep `Reset View` behavior and tween smoothness; include links in framing calculations.
- [ ] Keep existing WebGL fallback behavior intact.

---

## 7. App Integration

- [ ] Update `src/App.tsx` and supporting data flow so parsed schema with columns/props is passed into renderer.
- [ ] Keep parse error path explicit and non-crashing.
- [ ] Confirm startup still uses hard-coded schema fixture and renders deterministically.

---

## 8. Unit and Integration Coverage

- [ ] Add/update unit tests for:
  - Field property mapping and FK derivation logic.
  - 3D link route generator determinism and expected control-point structure.
- [ ] Add/update integration tests in `tests/integration/` for full pipeline:
  - `DBML -> parsed schema (fields + properties) -> layout -> scene data model`.
  - Verify expected table/field/property outputs for `users`, `posts`, `follows`.

---

## 9. Visual/E2E Verification (Mandatory)

- [ ] Update `tests/visual/scene.spec.ts` assertions for new expectations:
  - Canvas present and sized.
  - Reset View present and functional.
  - No page errors.
- [ ] Run headed e2e verification:
  - `pnpm test:e2e --headed`
- [ ] Use Playwright MCP to capture evidence screenshot at startup and save to `test-evidence/`.
- [ ] Manually validate from screenshot/e2e run:
  - Cards show header + field rows.
  - PK/FK/NN badges visible where expected.
  - Relationship paths visibly traverse 3D depth.

---

## 10. Final Quality Gate

- [ ] Run `pnpm lint`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm test:run`
- [ ] Run `pnpm test:e2e --headed`
- [ ] Confirm no unexpected console/runtime errors during startup and camera interaction.
- [ ] Update `PROJECT_OVERVIEW.md` if architectural boundaries/components changed.

---

When all tasks above are complete and all checks pass, output: <promise>DONE</promise>
