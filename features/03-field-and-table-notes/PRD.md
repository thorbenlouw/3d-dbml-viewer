# PRD — Field and Table Notes

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| **Feature**      | Field and Table Notes              |
| **Status**       | Draft                              |
| **Author**       | —                                  |
| **Last updated** | 2026-03-04                         |
| **Depends on**   | Render Table Fields and Properties |

---

## 1. Problem Statement

DBML supports `note` annotations on both tables and individual fields, allowing schema authors to attach documentation inline with the schema definition. Currently the 3D viewer discards these notes entirely. Engineers who rely on DBML notes to capture intent, domain context, or migration caveats have no way to surface that information while exploring the 3D diagram.

---

## 2. Goals

- Surface `note` annotations from DBML tables and fields directly in the 3D scene.
- Keep the scene uncluttered by default: indicate the presence of a note with a small icon, not the full text.
- Allow a user to reveal the full note for a single field or table at a time by clicking.
- Make it visually obvious which entity the revealed note belongs to (connection tube + highlight).
- Allow dismissal without full scene navigation reset.

---

## 3. Non-Goals (this feature)

- No note editing or inline DBML authoring.
- No multi-note panels open simultaneously.
- No search/filter by note content.
- No persistence of open/closed note state across sessions.
- No markdown rendering inside notes (plain text only).
- No note on relationship links (refs).

---

## 4. Visual Direction

### 4.1 Note indicator icon

- Every field row or table header that has a non-empty `note` displays a small note icon (📝 or a custom SVG chip).
- The icon appears at the far right of the row (to the right of any property badges), or in the table header for table-level notes.
- The icon is rendered as an R3F `<Text>` or sprite so it participates in the 3D card and billboards correctly.
- Icon must not overlap property badges; it occupies its own reserved column slot.

### 4.2 Note panel

When the user clicks a note icon:

- A floating panel appears in 3D space, positioned above/to the side of the owning TableCard, offset enough not to occlude the card.
- The panel is rendered as a slim rectangular card (similar aesthetic to TableCard: dark background, rounded-edge feel, readable white text).
- Panel contains:
  - A short header identifying the owner: `"Table: <table name>"` or `"<table name>.<field name>"`.
  - The note text, word-wrapped within the panel width.
  - A close icon (✕) in the top-right corner of the panel.
- The panel always faces the camera (billboard).
- Only one note panel is open at a time; clicking a second note icon closes the current panel and opens the new one.

### 4.3 Connection tube

- A thin tube (cylinder mesh or `<Line>`) connects the note panel to the originating row or header.
- Source anchor: the centre of the note icon on the card face.
- Target anchor: a point on the near edge of the note panel.
- The tube should curve slightly in 3D space (Catmull-Rom or simple arc with mid-point offset) to look intentional, not just a straight line.
- The tube is rendered only while the note panel is open and shares the same lifetime.

### 4.4 Highlight

- While a note panel is open, the owning row slice (or table header mesh) increases in brightness/glow (material emissive bump or colour shift toward a highlight accent colour, e.g. amber/gold).
- All other cards and rows are not dimmed — the highlight is additive, not exclusive.
- The highlight is removed when the panel is closed.

---

## 5. User Stories

- As an engineer, I can see at a glance which fields and tables carry documentation notes without opening any panel.
- As an engineer, I can click a note icon on a field row to read the full note text in context.
- As an engineer, I can click a note icon on a table header to read a table-level note.
- As an engineer, I can dismiss the note panel by clicking the close icon.
- As an engineer, clicking a different note icon automatically closes the previous panel and opens the new one.
- As an engineer, the note panel never obscures the card it belongs to.
- As an engineer, the visual tube and highlight make it unambiguous which entity the note describes.

---

## 6. Success Criteria

| #   | Criterion                                                                     | How to verify                    |
| --- | ----------------------------------------------------------------------------- | -------------------------------- |
| 1   | Fields with a `note` in DBML show a note icon in their row                    | Playwright MCP screenshot        |
| 2   | Tables with a `note` in DBML show a note icon in the header                   | Playwright MCP screenshot        |
| 3   | Fields/tables without a `note` show no icon                                   | Visual inspection                |
| 4   | Clicking a note icon opens the note panel                                     | Manual + E2E                     |
| 5   | Note panel shows correct owner header and note text                           | Manual + unit test on data model |
| 6   | Note panel is connected to the card by a visible tube                         | Playwright MCP screenshot        |
| 7   | The source row/header is visually highlighted while panel is open             | Playwright MCP screenshot        |
| 8   | Clicking ✕ closes the panel, removes tube, removes highlight                  | Manual                           |
| 9   | Clicking a second note while one is open replaces the first panel             | Manual                           |
| 10  | `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm test:e2e --headed` pass | CI/local                         |

---

## 7. Functional Requirements

### 7.1 Data model changes

- Extend `ParsedColumn` with an optional `note?: string` field.
- Extend `ParsedTable` with an optional `note?: string` field.
- Parser must extract `note` values from `@dbml/core` output for both tables and fields.
- Empty string notes are normalised to `undefined` (treated as absent).

### 7.2 Note indicator rendering

- `TableCard` must read `column.note` and `table.note`.
- For each column with a note: render a note icon element in the badge area / after badges, right-aligned.
- For a table with a note: render a note icon element in the header row (right side, after table name).
- Icon element must be clickable (use R3F `onClick` on a mesh or sprite).
- Icons must be positioned so they do not overlap badges.

### 7.3 Note panel component

- New component `NotePanel` (or `FieldNotePanel`) rendered in the scene.
- Props:
  - `ownerLabel: string` — header text (e.g. `"posts.body"` or `"Table: posts"`)
  - `noteText: string`
  - `anchorWorldPosition: THREE.Vector3` — world position of the note icon that triggered the panel
  - `cardPosition: THREE.Vector3` — owning card world position (used to choose panel offset direction)
  - `onClose: () => void`
- Panel is positioned by offsetting `anchorWorldPosition` in world space (upward and/or lateral, away from card).
- Panel billboards (quaternion copied from camera each frame).
- Panel dimensions adapt to text length (min/max clamps).
- Close icon (✕) is an interactive mesh in the top-right of the panel.

### 7.4 Connection tube

- `NoteConnector` component: renders a thin curved tube from `sourcePoint` (note icon centre on card) to `targetPoint` (near edge of note panel).
- Use `<Line>` from `@react-three/drei` with 8–16 sampled points along a Catmull-Rom curve with a single mid-point offset.
- Line colour matches the highlight accent (amber/gold).
- Tube is rendered as a child of the scene (not of `NotePanel` or `TableCard`) so world positions are independent.

### 7.5 Highlight

- When a note panel is open for a column, the owning row slice mesh should receive an emissive or colour-brightened material variant.
- When a note panel is open for a table, the header mesh should be highlighted.
- `TableCard` must accept an optional `highlightedColumn?: string | '__table__'` prop and apply the highlight material to the matching row or header.
- Highlight colour: amber/gold (e.g. `#f59e0b`), subtle — do not blow out the text.

### 7.6 State management

- `Scene` (or a new `NoteState` hook) owns a single piece of state: `activeNote: ActiveNote | null`.

```ts
interface ActiveNote {
  tableId: string;
  columnName?: string; // undefined = table-level note
  noteText: string;
  ownerLabel: string;
  anchorWorldPosition: THREE.Vector3;
  cardPosition: THREE.Vector3;
}
```

- Setting `activeNote` to a new value replaces any existing open note.
- Setting `activeNote` to `null` closes the panel.
- `TableCard` receives an `onNoteClick` callback and calls it when a note icon is clicked.

### 7.7 Interaction

- Orbit, pan, and zoom continue working while a note panel is open.
- The note panel moves with the camera (billboards) but stays at a fixed world position until dismissed.
- Clicking `Reset View` while a note is open does NOT auto-close the note.

---

## 8. Non-Functional Requirements

- No per-frame allocations in `useFrame` for the note panel.
- Panel and tube add at most two additional `useFrame` subscriptions (one for billboarding, one for tube update if panel moves).
- Keep strict TypeScript; no `any`.
- Panel max width: `3.0` world units; max height: `2.5` world units (text truncation/overflow with ellipsis at limit).

---

## 9. Technical Approach (High Level)

1. **Parser layer**: extract `note` from `@dbml/core`'s `Field.note` (string, may be absent) and `Table.note`. Add to `ParsedColumn` and `ParsedTable`.
2. **TableCard**: add note icon rendering per row and header. Add `onNoteClick` callback. Accept `highlightedColumn` prop for highlight.
3. **NotePanel**: new R3F component; plain rect + header text + body text + close button mesh.
4. **NoteConnector**: new R3F component; `<Line>` curved path from icon → panel.
5. **Scene**: own `activeNote` state; pass `onNoteClick` down to each `TableCard`; render `<NotePanel>` and `<NoteConnector>` when `activeNote !== null`.

---

## 10. Test Data Extension

The hard-coded schema in `src/data/schema.dbml.ts` must be extended to include:

- At least two **field-level notes** on different tables (e.g. on `posts.body` and `users.role`).
- At least one **table-level note** (e.g. on the `follows` table).
- At least one table with **no notes** (already the case for `posts` table overall) so absence is testable.

Example additions:

```dbml
Table follows [note: 'Adjacency list capturing social follow relationships'] {
  following_user_id integer
  followed_user_id integer
  created_at timestamp
}

Table users {
  id integer [primary key]
  username varchar
  role varchar [note: 'One of: admin, editor, viewer']
  created_at timestamp
}

Table posts {
  id integer [primary key]
  title varchar
  body text [note: 'Markdown content stored as plain text; HTML is escaped on read']
  user_id integer [not null]
  status varchar [note: 'draft | published | archived']
  created_at timestamp
}
```

A fixture file should be added at `tests/fixtures/notes-demo.dbml` mirroring the updated schema for use in parser unit tests.

---

## 11. File Impact (Expected)

- `src/data/schema.dbml.ts` — extend test data with notes
- `tests/fixtures/notes-demo.dbml` — new fixture file
- `src/types/index.ts` — add `note?` to `ParsedColumn` and `ParsedTable`
- `src/parser/index.ts` — extract note from parser output
- `src/renderer/TableCard.tsx` — note icon, highlight, `onNoteClick` callback
- `src/renderer/NotePanel.tsx` — new component
- `src/renderer/NoteConnector.tsx` — new component
- `src/renderer/Scene.tsx` — `activeNote` state, wire up components
- `src/renderer/constants.ts` — note icon char, highlight colour, panel sizing constants
- `tests/unit/parser.test.ts` — note extraction unit tests
- `tests/integration/pipeline.test.ts` — notes flow through pipeline
- `tests/visual/scene.spec.ts` — E2E: note icon visible, panel opens/closes

---

## 12. Testing Strategy

### Unit tests

- Parser: `note` on field → `ParsedColumn.note` populated; `note` on table → `ParsedTable.note` populated.
- Parser: absent note → `undefined` (not empty string).
- `NotePanel`: renders correct `ownerLabel` and `noteText` (via React Testing Library or direct prop inspection).

### Integration tests

- Full pipeline with `notes-demo.dbml` fixture: parsed schema includes `note` on correct columns and table.
- `TableCardNode` derived from parsed schema carries through note metadata.

### Visual / E2E

- Headed Playwright + Playwright MCP screenshot after opening app.
- Confirm note icons visible on expected rows.
- Simulate click on note icon; confirm panel appears with correct text.
- Simulate click on close icon; confirm panel disappears.
- Save evidence to `test-evidence/field-table-notes-*.png`.

---

## 13. Acceptance Tests

1. Load app; confirm `posts.body` row shows note icon.
2. Load app; confirm `posts.status` row shows note icon.
3. Load app; confirm `users.role` row shows note icon.
4. Load app; confirm `follows` table header shows note icon.
5. Click the note icon on `posts.body`; confirm panel appears with text "Markdown content stored…".
6. Confirm a tube connects the icon to the panel.
7. Confirm the `posts.body` row is visually highlighted.
8. Click ✕; confirm panel, tube, and highlight all disappear.
9. Click note on `users.role`; panel appears. Click note on `posts.status`; first panel is replaced by second.
10. No JS errors in the browser console throughout the above steps.

---

## 14. Risks and Mitigations

- **Panel occludes the card**: mitigated by applying a fixed offset in world space away from the card and choosing the offset axis based on card's position relative to scene centre.
- **Note text too long for panel**: mitigated by max-height clamp with ellipsis overflow and a sensible max-width.
- **Click hit detection in 3D**: R3F pointer events on meshes work correctly with OrbitControls; ensure `onClick` is on a mesh (not just a group) with a geometry that covers the icon area.
- **Highlight material mutation**: avoid mutating shared material instances; create per-card material refs so highlight state is local.

---

## 15. Definition of Done

- All success criteria are met.
- Required tests pass locally and in CI.
- Headed Playwright + MCP screenshot evidence captured in `test-evidence/`.
- `PROJECT_OVERVIEW.md` updated if new architectural components are introduced.
