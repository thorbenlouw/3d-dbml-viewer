# PRD - Render Table Fields and Properties

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| **Feature**      | Render Table Fields and Properties |
| **Status**       | Draft                              |
| **Author**       | -                                  |
| **Last updated** | 2026-03-04                         |
| **Depends on**   | Initial View in 3D                 |

---

## 1. Problem Statement

The current 3D view shows only table names as simple boxes. This is not sufficient for schema understanding because users cannot inspect column names, data types, or column constraints without leaving the 3D view.

The next feature must render table internals in 3D, inspired by dbdiagram's clear 2D table cards, while preserving the product's spatial value: relationships should route through 3D space, not flattened into 2D overlays.

---

## 2. Goals

- Render each table as a slim 3D card that contains:
  - table title row
  - one row per field
  - field data type
  - key properties/constraints
- Preserve dbdiagram-style readability (clean rows, clear hierarchy, predictable alignment).
- Keep cards camera-facing (billboard behavior) so text remains legible while orbiting.
- Render relationship links as routed 3D curves/segments that visibly travel through depth.
- Maintain smooth camera interaction and readable defaults at startup.

---

## 3. Non-Goals (this feature)

- No field editing or inline DBML authoring.
- No click-to-edit, drag-to-reorder, or schema mutation UI.
- No advanced edge labels (cardinality strings on lines) beyond existing relationship direction semantics.
- No minimap.
- No persistence of manual card positions.

---

## 4. Visual Direction (Inspired by dbdiagram)

Reference style from the provided dbdiagram screenshot:

- Table cards are rectangular, slim, and visually lightweight.
- Strong visual separation between header and body.
- Body rows align as: `field name | field type | badges/properties`.
- Properties are concise markers (e.g., `PK`, `FK`, `NN`, `UQ`) displayed as subtle badges/chips.

3D adaptation requirements:

- Keep cards thin in depth ("slim cards") but non-zero thickness so they feel spatial.
- Keep front-face readability comparable to 2D when viewed from default camera.
- Links must route with deliberate depth variation so crossings are easier to parse than in flat 2D.

---

## 5. User Stories

- As an engineer, I can load the app and immediately read fields/types for each table without opening another panel.
- As an engineer, I can understand key column properties (PK/FK/NN/etc.) directly on each row.
- As an engineer, I can orbit the camera and still see labels clearly because cards face the camera.
- As an engineer, I can visually follow relationships in 3D and distinguish overlapping paths.

---

## 6. Success Criteria

| #   | Criterion                                                                                             | How to verify                |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Startup view shows all hard-coded tables as slim 3D cards with header + field rows                    | Manual + visual test         |
| 2   | Every field row displays field name and field type                                                    | Manual + integration test    |
| 3   | Known properties from DBML settings are rendered as badges (at minimum `PK`, `FK`, `NN`) when present | Unit + manual                |
| 4   | Relationship lines are visible as 3D-routed paths, not single flat straight lines                     | Manual + screenshot evidence |
| 5   | Cards remain camera-facing while orbiting                                                             | Manual                       |
| 6   | Default camera framing keeps all cards readable on first load (desktop viewport)                      | Manual                       |
| 7   | Reset View still frames all cards and links                                                           | Manual + e2e                 |
| 8   | `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm test:e2e --headed` pass                         | CI/local                     |

---

## 7. Functional Requirements

### 7.1 Data extraction for fields and properties

Extend parser output to include field-level metadata required for rendering:

- `table.columns[]` with:
  - `name`
  - `type`
  - `isPrimaryKey`
  - `isForeignKey` (derived from refs)
  - `isNotNull`
  - `isUnique` (if available)
  - optional `default`/`note` support for future display

The renderer must not parse DBML directly; it consumes typed parser output.

### 7.2 Table card geometry and layout

Each table is rendered as a `TableCard` with:

- Thin box depth (target range: `0.06`-`0.14` world units).
- Width derived from longest text line with min/max clamp.
- Height derived from number of rows:
  - header row + N field rows
  - consistent row spacing and padding
- Optional card outline/edge treatment to preserve legibility on dark background.

### 7.3 Text rendering

Per card:

- Header text: table name.
- Field rows:
  - left aligned field name
  - right/column-aligned type string
  - trailing badge group for properties
- Truncation and max width rules prevent overflow.

### 7.4 Property badges

Render compact badges for known properties:

- `PK` for primary key
- `FK` for foreign key
- `NN` for not null
- `UQ` for unique

Badge rendering can be text chips or concise glyph-like tokens, but must remain readable at default camera distance.

### 7.5 Relationship links in 3D space

Replace/extend basic lines with routed 3D paths:

- Link source/target anchor at card edges.
- Path uses 3-5 control points with depth offsets so links arc through space.
- Deterministic routing for stable reload behavior.
- Offset strategy reduces complete overlap when multiple links share endpoints.
- Links should avoid passing through card bodies where possible.

Implementation options (either acceptable in this feature):

- Catmull-Rom spline rendered as sampled line/tube.
- Orthogonal polyline with depth detours rendered as line segments.

### 7.6 Interaction and camera

- Existing orbit/pan/zoom behavior remains.
- Reset View includes full extents of cards and routed links.
- Card billboarding remains enabled.

### 7.7 Accessibility and fallback

- Existing WebGL unavailable fallback remains functional.
- Reset button remains keyboard-accessible.

---

## 8. Non-Functional Requirements

- Startup render target: <= 1.5s for current demo schema on a typical developer laptop.
- Maintain interactive orbit at usable frame rates for small/medium schemas.
- Avoid per-frame allocations in `useFrame` loops where practical.
- Keep strict TypeScript types; no `any`.

---

## 9. Technical Approach (High Level)

- Parser/type layer:
  - enrich shared schema types with column property metadata
  - derive FK flags from ref graph
- Renderer:
  - replace `TableBox` internals with card-style composition (header plane + row texts + badge texts)
  - keep billboarding and distance-aware visual tuning
- Links:
  - introduce a `RelationshipLink3D` renderer and a deterministic route generator
- Scene:
  - render cards + relationship links from same layout graph

---

## 10. File Impact (Expected)

- `src/types/index.ts` (or related shared type modules)
- `src/parser/*` (field/property extraction)
- `src/renderer/TableBox.tsx` (or renamed `TableCard.tsx`)
- `src/renderer/Scene.tsx` (links + framing)
- `src/renderer/constants.ts` (card metrics, spacing, badge sizing, link routing constants)
- `tests/unit/*` and `tests/integration/*`
- `tests/visual/scene.spec.ts`

---

## 11. Testing Strategy

### Unit tests

- Parser mapping of DBML columns -> field metadata and property flags.
- FK derivation logic from refs.
- 3D route generator determinism and basic non-overlap behavior.

### Integration tests

- Full pipeline `DBML -> parsed schema -> layout -> render model` includes fields and properties.
- Component integration verifies expected row labels/badges are present in rendered scene metadata layer (where testable without WebGL assertions).

### Visual/E2E (mandatory)

- Run headed Playwright: `pnpm test:e2e --headed`.
- Use Playwright MCP to capture GPU-rendered startup scene.
- Save evidence under `test-evidence/` (for example: `test-evidence/render-table-fields-and-properties-startup.png`).
- Verify in screenshot:
  - cards show header + rows
  - property badges visible
  - relationship links traverse depth in 3D

---

## 12. Acceptance Tests

1. Start app with `pnpm dev` and open `http://localhost:5173`.
2. Confirm each table card shows all fields from hard-coded schema.
3. Confirm at least these row properties appear where applicable:
   - `users.id` -> `PK`
   - `posts.user_id` -> `FK`, `NN`
4. Orbit camera around 360 degrees and confirm cards remain camera-facing.
5. Confirm relationship links are visibly routed in depth (non-flat appearance).
6. Click `Reset View`; all cards and links return to framed overview.
7. Confirm browser console has no runtime errors.

---

## 13. Risks and Mitigations

- Text density in 3D may reduce readability.
  - Mitigation: enforce min font size, row spacing, width clamps, and camera framing tuned for readability.
- Link clutter may increase with more refs.
  - Mitigation: deterministic depth offsets, endpoint fan-out, and future bundling hooks.
- Performance regressions from many text meshes.
  - Mitigation: memoize static geometries/materials and avoid unnecessary re-renders.

---

## 14. Definition of Done

- All success criteria are met.
- Required tests pass locally and in CI.
- Headed Playwright + MCP screenshot evidence is captured in `test-evidence/`.
- `PROJECT_OVERVIEW.md` is updated if architectural structure changes.
