# TODO — Field and Table Notes

Tasks derived from `PRD.md`. Work in the order listed; each group can be committed independently.

---

## 1. Test data & fixtures

### 1.1 Extend hard-coded schema with notes

- In `src/data/schema.dbml.ts`, update the DBML string to add:
  - Table-level note on `follows`: `[note: 'Adjacency list capturing social follow relationships']`
  - Field note on `users.role`: `[note: 'One of: admin, editor, viewer']`
  - Field note on `posts.body`: `[note: 'Markdown content stored as plain text; HTML is escaped on read']`
  - Field note on `posts.status`: `[note: 'draft | published | archived']`
- Verify the DBML string remains valid by running `pnpm dev` briefly to confirm no parse errors.

### 1.2 Add fixture file

- Create `tests/fixtures/notes-demo.dbml` containing the same schema as the updated hard-coded DBML (minus the JS wrapper).
- This file is used exclusively by parser unit tests.

---

## 2. Type layer

### 2.1 Add `note` to `ParsedColumn`

- In `src/types/index.ts`, add `note?: string` to the `ParsedColumn` interface.

### 2.2 Add `note` to `ParsedTable`

- In `src/types/index.ts`, add `note?: string` to the `ParsedTable` interface.

---

## 3. Parser

### 3.1 Extract field notes

- In `src/parser/index.ts`, when mapping `@dbml/core` fields to `ParsedColumn`, read `field.note?.value` (or whichever property the library exposes).
- Normalise: if the value is an empty string or whitespace-only, set `note` to `undefined`.

### 3.2 Extract table notes

- In `src/parser/index.ts`, read `table.note?.value` and map to `ParsedTable.note` with the same normalisation.

### 3.3 Unit tests — parser note extraction

- In `tests/unit/parser.test.ts` (create if absent), add tests using `notes-demo.dbml` fixture:
  - `posts.body` column has `note` equal to the expected string.
  - `posts.status` column has `note` equal to the expected string.
  - `users.role` column has `note` equal to the expected string.
  - `follows` table has `note` equal to the expected string.
  - `users.id` (no note) has `note === undefined`.
  - `users` table (no table-level note) has `note === undefined`.

---

## 4. Renderer — constants

### 4.1 Add note-related constants

- In `src/renderer/constants.ts`, add:
  - `NOTE_ICON_CHAR` — the character/emoji to display (e.g. `'📝'` or a simpler glyph like `'✎'`).
  - `NOTE_ICON_SIZE` — font size for the icon (e.g. same as `TEXT_BADGE_SIZE`).
  - `NOTE_HIGHLIGHT_COLOR` — amber/gold hex (e.g. `'#f59e0b'`).
  - `NOTE_PANEL_MAX_WIDTH` — world units (e.g. `3.0`).
  - `NOTE_PANEL_MAX_HEIGHT` — world units (e.g. `2.5`).
  - `NOTE_PANEL_PADDING` — world units (e.g. `0.12`).
  - `NOTE_PANEL_OFFSET` — how far in world space the panel floats from the anchor (e.g. `1.8`).
  - `NOTE_CONNECTOR_COLOR` — tube/line colour (same as `NOTE_HIGHLIGHT_COLOR`).
  - `NOTE_CONNECTOR_LINE_WIDTH` — e.g. `1.5`.

---

## 5. Renderer — state model

### 5.1 Define `ActiveNote` type

- In `src/types/index.ts`, add:

```ts
export interface ActiveNote {
  tableId: string;
  columnName?: string; // undefined = table-level note
  noteText: string;
  ownerLabel: string;
  anchorWorldPosition: THREE.Vector3;
  cardPosition: THREE.Vector3;
}
```

_(Import `* as THREE from 'three'` only if the types file already has Three.js as a dependency; otherwise represent the position as `[number, number, number]` and convert at the call site.)_

---

## 6. Renderer — TableCard changes

### 6.1 Add note icon to field rows

- In `src/renderer/TableCard.tsx`, for each column where `column.note` is truthy:
  - Render a `<Text>` element with `NOTE_ICON_CHAR` positioned to the right of (or replacing the rightmost gap after) the badge group.
  - Wrap the icon in a transparent `<mesh>` hit area (small box geometry, `visible={false}`) with an `onClick` handler.
  - `onClick` computes the world position of the icon and calls `props.onNoteClick({ tableId, columnName: column.name, noteText: column.note, ownerLabel: \`${table.name}.${column.name}\`, anchorWorldPosition, cardPosition })`.

### 6.2 Add note icon to table header

- In `src/renderer/TableCard.tsx`, if `node.table.note` is truthy:
  - Render a `<Text>` note icon in the header row, right-aligned (right of table name, within header).
  - Same hit-area mesh + `onClick` pattern; `ownerLabel` is `\`Table: ${table.name}\``, `columnName`is`undefined`.

### 6.3 Add `highlightedColumn` prop

- Add optional prop `highlightedColumn?: string | '__table__'` to `TableCardProps`.
- When `highlightedColumn` matches a column name, override that row slice's mesh material colour to `NOTE_HIGHLIGHT_COLOR` (or a brightened variant).
- When `highlightedColumn === '__table__'`, highlight the header mesh.
- Use per-instance material (create a separate `MeshBasicMaterial` for highlighted rows; do not mutate shared materials).

### 6.4 Add `onNoteClick` prop

- Add `onNoteClick?: (note: ActiveNote) => void` to `TableCardProps`.
- Wire up the click handlers from 6.1 and 6.2 to call this callback.

---

## 7. Renderer — NotePanel component

### 7.1 Create `src/renderer/NotePanel.tsx`

- Props:
  ```ts
  interface NotePanelProps {
    ownerLabel: string;
    noteText: string;
    position: [number, number, number];
    onClose: () => void;
  }
  ```
- Billboard: in `useFrame`, copy `camera.quaternion` to the group ref.
- Render:
  - Background rect mesh (dark, `CARD_BODY_COLOR` or slightly lighter).
  - Edge outline (`lineSegments` with `EdgesGeometry`).
  - Header `<Text>` — `ownerLabel`, smaller bold style.
  - Body `<Text>` — `noteText`, word-wrapped, `maxWidth` = panel width minus padding.
  - Close button: small mesh in top-right corner with `✕` `<Text>` child; `onClick` calls `onClose`.
- Panel dimensions: computed from text length with min/max clamps using constants from step 4.1.
- Dispose geometry on unmount.

---

## 8. Renderer — NoteConnector component

### 8.1 Create `src/renderer/NoteConnector.tsx`

- Props:
  ```ts
  interface NoteConnectorProps {
    from: [number, number, number]; // note icon world position
    to: [number, number, number]; // near edge of note panel
  }
  ```
- Compute a Catmull-Rom curve: `[from, midPoint, to]` where `midPoint` is offset perpendicular to the `from→to` direction by a small amount (e.g. 0.4 world units) to give a gentle arc.
- Sample curve into 16 points.
- Render using `<Line points={…} color={NOTE_CONNECTOR_COLOR} lineWidth={NOTE_CONNECTOR_LINE_WIDTH} />` from `@react-three/drei`.

---

## 9. Renderer — Scene wiring

### 9.1 Add `activeNote` state to Scene

- In `src/renderer/Scene.tsx`, add `const [activeNote, setActiveNote] = useState<ActiveNote | null>(null)`.

### 9.2 Pass `onNoteClick` to each `TableCard`

- Pass `onNoteClick={setActiveNote}` to every `<TableCard>`.

### 9.3 Pass `highlightedColumn` to each `TableCard`

- For each `TableCard`, compute `highlightedColumn`:
  - If `activeNote?.tableId === node.id`, return `activeNote.columnName ?? '__table__'`.
  - Otherwise `undefined`.

### 9.4 Render `NotePanel` and `NoteConnector` conditionally

- When `activeNote !== null`:
  - Compute `panelPosition` by offsetting `activeNote.anchorWorldPosition` (e.g. add `NOTE_PANEL_OFFSET` upward + slight lateral offset away from scene centre).
  - Render `<NotePanel ownerLabel={…} noteText={…} position={panelPosition} onClose={() => setActiveNote(null)} />`.
  - Render `<NoteConnector from={activeNote.anchorWorldPosition.toArray()} to={panelPosition} />`.

---

## 10. Integration test

### 10.1 Pipeline integration test with notes

- In `tests/integration/pipeline.test.ts` (create if absent):
  - Parse `notes-demo.dbml` through the full parser → layout pipeline.
  - Assert the resulting `TableCardNode` for `posts` has column `body` with correct `note` string.
  - Assert the `follows` `TableCardNode` has `table.note` set.

---

## 11. E2E tests

### 11.1 Extend `tests/visual/scene.spec.ts`

- Add a test block `'field and table notes'`:
  - Load `http://localhost:5173`.
  - Confirm no JS errors.
  - _(Structural)_ Assert the canvas is present (existing test coverage is sufficient for headless).

### 11.2 Playwright MCP screenshot evidence

- Use Playwright MCP `browser_navigate` + `browser_screenshot` in headed mode.
- Capture and save:
  - `test-evidence/notes-icons-visible.png` — confirm note icons appear on expected rows.
  - `test-evidence/notes-panel-open.png` — after clicking a note icon, confirm panel + tube visible.
  - `test-evidence/notes-panel-closed.png` — after clicking ✕, confirm panel gone.

---

## 12. Lint, typecheck, test pass

- Run `pnpm lint` — fix any new issues.
- Run `pnpm typecheck` — fix any type errors.
- Run `pnpm test:run` — all unit + integration tests pass.
- Run `pnpm test:e2e --headed` — E2E tests pass.

---

## 13. Documentation

### 13.1 Update `PROJECT_OVERVIEW.md`

- Add `NotePanel` and `NoteConnector` to the renderer layer description.
- Note that `ParsedColumn` and `ParsedTable` now carry an optional `note` field.

---

When all tasks above are complete the agent should output <promise>DONE</promise>
