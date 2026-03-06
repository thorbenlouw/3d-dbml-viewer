# PRD — Hover Navigation Panel and Column-Centric Highlighting

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| **Feature**      | Hover Navigation Panel and Column-Centric Highlighting |
| **Status**       | Draft                                                  |
| **Author**       | —                                                      |
| **Last updated** | 2026-03-04                                             |
| **Depends on**   | Interactive Layout; Field and Table Notes              |

---

## 1. Problem Statement

Current note discovery is click-driven on small note icons inside the 3D cards. In practice this creates interaction conflict and friction while navigating dense schemas. Users need passive contextual information while hovering, plus stronger visual tracing from a hovered column to its relationships.

---

## 2. Goals

- Add a static right-side navigation overlay panel that updates on hover.
- Show table context for hovered entities: table name, table group, and referenced tables.
- Show note content in the panel when a hovered table/column has a note.
- Remove note-icon click interaction and note-icon hover glow behavior.
- Make primary-key field names visually distinct by rendering them in bold.
- Highlight the hovered column row in yellow.
- Highlight relationship tubes in yellow when they reference the hovered column.

---

## 3. Non-Goals (this feature)

- No editing or persistence of notes.
- No click-to-open note panel in 3D space.
- No multi-selection or pinned hover state.
- No search/filter in the navigation panel.
- No changes to force-simulation behavior.

---

## 4. UX and Visual Direction

### 4.1 Right-side navigation panel

- Panel is always visible, fixed to the right side of the viewport.
- Styling is semi-transparent but mostly solid (high readability over scene background).
- Suggested style baseline:
  - Background: deep slate/blue with ~88-92% opacity.
  - Text: high-contrast off-white.
  - Accent: yellow for active/hover-linked elements.
- Panel content blocks:
  - Hover target label (`table` or `table.column`).
  - Table name.
  - Table group (or `Ungrouped` when absent).
  - Referenced tables list (tables this table references via outgoing refs).
  - Note value (if present on hovered column; otherwise table note; otherwise empty-state text).

### 4.2 Note icons

- Note icons remain as passive indicators only.
- Remove icon hover border/glow.
- Remove icon clickability and related pointer affordances.
- Remove click-to-open note panel/connector behavior from scene interactions.

### 4.3 Highlight behavior

- When hovering a specific column row:
  - That row background becomes yellow.
  - Any relationship tube linked to that exact column becomes yellow.
- When not hovering a column:
  - Row and link colors return to defaults.

### 4.4 Primary key typography

- Column names with `isPrimaryKey === true` are rendered bold in table cards.
- Bold should preserve readability at existing card scale.

---

## 5. User Stories

- As an engineer, I can hover fields and immediately see their note and relationship context without clicking.
- As an engineer, I can see which table and table group I am inspecting.
- As an engineer, I can quickly identify which tables the current table references.
- As an engineer, I can visually trace a hovered column to its relationship tubes via yellow highlighting.
- As an engineer, I can immediately recognize primary keys by bold field text.

---

## 6. Success Criteria

| #   | Criterion                                                                         | How to verify                |
| --- | --------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Right-side navigation panel is always present in scene                            | Playwright headed screenshot |
| 2   | Hovering table header updates table name, table group, referenced tables in panel | Manual + E2E                 |
| 3   | Hovering field row shows column-specific note when present                        | Manual + E2E                 |
| 4   | Note icons are not clickable and no longer glow on hover                          | Manual + E2E                 |
| 5   | Primary-key field names render bold                                               | Playwright headed screenshot |
| 6   | Hovered column row turns yellow                                                   | Playwright headed screenshot |
| 7   | Relationship tubes attached to hovered column turn yellow                         | Playwright headed screenshot |
| 8   | `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm test:e2e --headed` pass     | Local/CI                     |

---

## 7. Functional Requirements

### 7.1 Hover interaction model

- Introduce scene-level hover state describing current focus.
- Hover sources:
  - Table header hit region (table-level hover).
  - Column row hit region (column-level hover).
- Hover state clears on pointer leave.

Suggested type:

```ts
interface HoverContext {
  tableId: string;
  tableName: string;
  tableGroup?: string;
  columnName?: string;
  note?: string;
}
```

### 7.2 Table group support

- Extend parsed table metadata to include optional table group.
- If parser cannot resolve a group, treat as `undefined` and render `Ungrouped` in UI.

### 7.3 Referenced tables derivation

- For current hovered table, derive outgoing references from `schema.refs` (`sourceId === tableId`).
- Render unique target table names in panel.
- Empty-state text when no outgoing references.

### 7.4 Navigation panel component

- New DOM overlay component (outside `<Canvas>`) mounted in `Scene` container.
- Receives `hoverContext`, resolved referenced-table list, and display note string.
- Uses fixed positioning on right with responsive width and scrolling for long content.

### 7.5 TableCard interaction updates

- Remove note icon click handlers.
- Remove note icon hover border state.
- Add table/header and row hover callbacks to report hover context to parent scene.
- Keep note icons visually present as passive indicators when a note exists.

### 7.6 Column and link highlighting

- `TableCard` accepts `highlightedColumn?: string` and applies yellow row background to matching row.
- `RelationshipLink3D` accepts highlight flag and uses yellow material color when true.
- A link is highlighted if hovered context has `columnName` and:
  - `link.sourceId === hovered.tableId` and `columnName` in `link.sourceFieldNames`, or
  - `link.targetId === hovered.tableId` and `columnName` in `link.targetFieldNames`.

### 7.7 Primary key bold text

- For `column.isPrimaryKey`, render column name text in bold style.
- If drei/font stack does not reliably apply weight, use a deliberate fallback (e.g., duplicate text with slight offset or alternate bold font asset).

### 7.8 Remove note panel path

- Remove `activeNote` click flow from scene for this feature path:
  - No `onNoteClick` wiring.
  - No `NotePanel`/`NoteConnector` rendering from icon click.

---

## 8. Non-Functional Requirements

- Keep strict TypeScript.
- Avoid per-frame allocations for hover-only state.
- Overlay remains readable on desktop and laptop widths; no canvas obstruction beyond right panel.
- Maintain existing drag/navigate mode behavior introduced in interactive layout.

---

## 9. Technical Approach (High Level)

1. Extend shared types/parser to include optional `tableGroup`.
2. Build `NavigationPanel` component under `src/renderer/`.
3. Add hover callback props to `TableCard` and emit hover context from header/row hit meshes.
4. Remove note icon click/hover logic in `TableCard`.
5. In `Scene`, own hover state and compute:
   - panel data (table, group, references, note),
   - highlighted column,
   - highlighted links.
6. Update `RelationshipLink3D` material color based on highlight prop.
7. Update tests and visual evidence.

---

## 10. File Impact (Expected)

- `src/types/index.ts` — optional `tableGroup` and hover types if shared
- `src/parser/index.ts` — extract table-group metadata where available
- `src/renderer/Scene.tsx` — hover state, panel wiring, link highlight wiring
- `src/renderer/TableCard.tsx` — remove icon clicks, add hover emitters, PK bold, row highlight
- `src/renderer/RelationshipLink3D.tsx` — highlighted color mode
- `src/renderer/constants.ts` — nav panel and highlight tokens
- `src/renderer/NavigationPanel.tsx` — new component
- `tests/visual/scene.spec.ts` — overlay + hover highlight assertions
- `tests/e2e/interactiveLayout.spec.ts` — ensure mode interactions still hold

---

## 11. Testing Strategy

### Unit / integration

- Parser test for table-group extraction and fallback behavior (`Ungrouped` path).
- Scene-level logic test (or utility test) for:
  - referenced table list derivation,
  - link highlight matching by hovered column.

### Visual / E2E (headed)

- Verify static right panel is visible.
- Hover a column with note and confirm panel note text updates.
- Verify hovered column row is yellow.
- Verify at least one matching relationship tube is yellow.
- Verify note icons do not open any panel on click.
- Save screenshot evidence to `test-evidence/hover-navigation-panel.png`.

---

## 12. Risks and Mitigations

- **Risk:** `@dbml/core` table-group shape may differ from assumed API.
  - **Mitigation:** Implement guarded parsing with type narrowing and fallback to `Ungrouped`.
- **Risk:** Bold rendering support in `drei/Text` may vary by font.
  - **Mitigation:** Validate visually; add deterministic fallback rendering if needed.
- **Risk:** Extra hover hit meshes may conflict with drag interactions.
  - **Mitigation:** Keep drag mode and navigate mode mutually exclusive as currently implemented.
