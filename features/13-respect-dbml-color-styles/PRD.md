# PRD: Respect DBML Color Styles in 3D Rendering

## Problem

The renderer currently does not fully respect DBML style color settings.
Users can define colors in DBML for several components, but those semantics are
not consistently reflected in the 3D view.

This causes:

- Loss of intent when schemas use color to encode domain meaning.
- Mismatch between DBML source and rendered output.
- Reduced readability for grouped domains and relationship tracing.

## Goal

Implement end-to-end support for DBML color styles (at minimum: table header,
relationship reference, table group, and table partial-derived header color),
with renderer-appropriate transparency so visuals stay legible.

## Supported DBML Style Inputs (v1)

Based on official DBML syntax docs:

1. `Table ... [headercolor: <color_code>]`
2. `Ref ... [color: <color_code>]` (long/short forms)
3. `TableGroup ... [color: <color_code>]`
4. `TablePartial ... [headerColor/headercolor: <color_code>]` via injection

## Design Decisions

1. Keep DBML as source of truth for style values.
2. Parse and normalize color values once, then pass typed color tokens into
   layout/renderer layers.
3. Apply alpha in renderer even if DBML color is opaque:
   - table headers: lightly translucent
   - relationship lines: slightly translucent for depth readability
   - table group boundaries: very translucent fill + clear edge tint
4. `TableGroup` color influences the group bounding box shade.
5. Table-level color overrides group-derived table tinting.
6. Table-local `headercolor` overrides partial-derived header color.
7. For partial conflicts, follow DBML precedence: last injected partial wins,
   then local table settings override partials.

## Non-Goals

- Adding a full theming system or custom palettes.
- Supporting non-color style properties beyond current scope.
- Changing DBML parsing semantics outside documented behavior.

## Success Criteria

| #   | Criterion                                                                 |
| --- | ------------------------------------------------------------------------- |
| 1   | Tables render header colors from DBML `headercolor` when present.         |
| 2   | Ref lines render using DBML `Ref color` when present.                     |
| 3   | TableGroup bounding boxes are tinted by DBML `TableGroup color`.          |
| 4   | Partial-derived header colors apply when table-local header color absent. |
| 5   | Table-local header color overrides partial-derived color.                 |
| 6   | Supported colors render with controlled alpha for visual clarity.         |
| 7   | Invalid/unsupported color input falls back safely without crash.          |
| 8   | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.                  |
| 9   | Headed visual verification confirms expected color styling in scene.      |

## Scope

### In Scope

- Type additions for style color fields where needed.
- Parser/data mapping for table, ref, tablegroup, and tablepartial color flow.
- Style precedence and override resolution.
- Renderer color application with transparency policy.
- Tests for precedence, fallback, and rendering contract.

### Out of Scope

- Color pickers/editing UI.
- Runtime theme switching unrelated to DBML.
- Large renderer material redesign.

## UX / Visual Rules

1. Colors should preserve user intent but remain readable in 3D.
2. Alpha must be deterministic by component type (not ad hoc per object).
3. Group boundaries stay subtle: low-opacity fill, visible edge/outline.
4. Relationship color should remain visible against light and dark table faces.
5. Missing styles use existing defaults with no regressions.

## Technical Approach

### Style Normalization

- Add a central utility to:
  - parse DBML color strings (`#RGB`, `#RRGGBB`, named/html color if accepted)
  - normalize to renderer-ready representation
  - apply per-component alpha policy
- Return `undefined` on invalid values and use defaults.

### Style Resolution Pipeline

1. Gather style data from parsed schema.
2. Resolve precedence for each table:
   - local table `headercolor`
   - else resolved partial-derived `headercolor`
   - else optional group-derived fallback tint (if enabled by design)
   - else default renderer color
3. Resolve reference line colors from `Ref color`.
4. Resolve tablegroup boundary color from `TableGroup color`.

### Renderer Integration

- Thread resolved style tokens into:
  - table header material
  - relationship line material
  - tablegroup boundary material
- Keep transparency + depth settings tuned to avoid washed-out or invisible
  elements.

## Risks and Mitigations

1. Confusing precedence across partials and table-local styles.
   - Mitigation: explicit precedence tests and documented resolver order.
2. Low contrast due to transparency in dense scenes.
   - Mitigation: per-component alpha constants with minimum contrast checks.
3. Parser differences in key casing (`headerColor` vs `headercolor`).
   - Mitigation: normalize case in style extractor.
4. Unsupported color formats.
   - Mitigation: strict parse + fallback defaults + warning logs in dev.

## Acceptance Tests

| #   | Scenario                                               | Expected                                                     |
| --- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | Table with local `headercolor`                         | Header uses specified color with configured alpha            |
| 2   | Table with partial `headerColor`, no local table color | Header uses partial-derived color                            |
| 3   | Table with partial + local table `headercolor`         | Local table color wins                                       |
| 4   | Multiple partials define header color                  | Last injected partial wins when no local table override      |
| 5   | Ref with `color` setting                               | Relationship line uses specified color with configured alpha |
| 6   | TableGroup with `color`                                | Group boundary is tinted with that color shade               |
| 7   | Invalid color input                                    | Safe fallback to default styling                             |
| 8   | `pnpm lint && pnpm typecheck`                          | No errors                                                    |
| 9   | `pnpm test:run`                                        | All tests pass                                               |
| 10  | `pnpm test:e2e --headed` + screenshot evidence         | Visible style application in 3D scene confirmed              |

## Notes

- This feature is spec-only in this change; no implementation is included.
- Official reference used for style syntax:
  https://dbml.dbdiagram.io/docs
