# TODO: Respect DBML Color Styles in 3D Rendering

## Tasks

### 1. Confirm and encode style fields in shared types

In `src/types/index.ts` and parser-facing types:

- Add/confirm typed fields for:
  - table header color
  - relationship/reference color
  - tablegroup color
  - partial-derived table header color (resolved form)
- Keep fields optional and backward compatible.

---

### 2. Add/extend parser style extraction

In `src/parser/`:

- Extract style color values from DBML model for:
  - `Table [headercolor: ...]`
  - `Ref [color: ...]`
  - `TableGroup [color: ...]`
  - `TablePartial [headerColor/headercolor: ...]`
- Normalize key casing where needed.
- Preserve source color strings for resolver input.

---

### 3. Implement style precedence resolver

Add a dedicated resolver utility (parser or renderer-prep boundary) that
computes final style assignments.

Required precedence for table header color:

1. Table-local `headercolor`
2. Else partial-derived header color (last injected partial wins)
3. Else default

Group behavior:

- `TableGroup color` always tints the group bounding box.
- Table-local/partial table colors override any group-derived table tinting.

---

### 4. Implement color normalization and alpha policy

Create a shared color utility module:

- Parse accepted DBML color formats into renderer-compatible color values.
- Apply deterministic alpha by component:
  - table header
  - ref line
  - tablegroup boundary fill/edge
- On invalid color input, return fallback default safely.

Document constants and rationale in code comments.

---

### 5. Thread resolved colors through layout/scene data flow

In data preparation and scene orchestration (`src/renderer/Scene.tsx` and
related modules):

- Include resolved style tokens on render models for tables, refs, and groups.
- Ensure existing behavior is unchanged when no style is provided.

---

### 6. Apply styles in renderer components

In `src/renderer/` components:

- Table header visuals consume resolved table header color.
- Ref line materials consume resolved reference color.
- TableGroup boundary component consumes resolved group color.
- Ensure transparency settings preserve readability and visibility.

---

### 7. Add/extend fixtures for style scenarios

In `tests/fixtures/`:

- Add DBML fixtures covering:
  - local table header color
  - partial-derived header color
  - local table override of partial
  - multiple partial conflict (last wins)
  - ref color
  - tablegroup color
  - invalid color fallback

Do not alter unrelated existing fixtures.

---

### 8. Unit tests for parsing and precedence

Add tests under `tests/unit/` for:

- style field extraction correctness
- color parser normalization/fallback
- precedence logic (table vs partial, partial order)
- tablegroup color propagation to group style model

---

### 9. Integration tests for pipeline behavior

Add/extend tests under `tests/integration/`:

- DBML -> parsed schema -> resolved style model -> render model
- Ensure cross-group refs still render and style application does not break
  layout behavior.

---

### 10. Visual verification (headed)

Run headed verification for renderer changes:

```bash
pnpm dev
pnpm test:e2e --headed
```

Capture screenshot evidence showing:

- styled table headers
- styled relationship lines
- tablegroup boundary tinting

Save evidence as:

- `test-evidence/dbml-color-styles-headed.png`

---

### 11. Validate quality gates

Run:

```bash
pnpm lint && pnpm typecheck
pnpm test:run
```

Fix all failures before considering complete.

---

### 12. Documentation updates

- Update `PROJECT_OVERVIEW.md` if style-resolution architecture changes.
- Add concise notes about supported DBML style attributes and precedence.

---

When all tasks are complete the agent should output <promise>DONE</promise>.
