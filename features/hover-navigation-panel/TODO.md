# TODO — Hover Navigation Panel and Column-Centric Highlighting

Reference spec: `features/hover-navigation-panel/PRD.md`

---

## Task 1 — Extend schema metadata for table groups

**Files:**

- `src/types/index.ts`
- `src/parser/index.ts`
- `tests/unit/parser.test.ts`

### Changes

1. Add optional `tableGroup?: string` to `ParsedTable`.
2. Update parser DBML shape typings to include group metadata.
3. Map table-group value onto parsed tables with guarded type checks.
4. Keep fallback behavior: missing/unknown group => `undefined`.
5. Add/extend parser unit tests to confirm:
   - group name extracted when present,
   - no group yields `undefined`.

**Acceptance:** `pnpm test:run` passes for parser tests.

---

## Task 2 — Add shared hover context and resolver utilities

**Files:**

- `src/types/index.ts`
- `src/renderer/Scene.tsx` (or `src/renderer/hoverContext.ts` new helper)
- `tests/unit/` (new helper test file if utility extracted)

### Changes

1. Define hover context type (tableId, tableName, optional tableGroup, optional columnName, optional note).
2. Add utility to derive referenced tables from `schema.refs` for a table id.
3. Add utility to evaluate whether a relationship link should highlight for a hovered column.
4. Unit-test the utilities with edge cases:
   - no outgoing refs,
   - duplicate targets,
   - source-side and target-side column matches.

**Acceptance:** deterministic utility tests pass.

---

## Task 3 — Build static right-side `NavigationPanel`

**File:** `src/renderer/NavigationPanel.tsx` (new)

### Changes

1. Create a DOM overlay panel component with props:

```ts
interface NavigationPanelProps {
  hoverContext: HoverContext | null;
  referencedTables: string[];
}
```

2. Render sections:
   - Hover target (`Table` or `Table.Column`).
   - Table name.
   - Table group (`Ungrouped` fallback).
   - Referenced tables list.
   - Note value (if `hoverContext.note` exists, else friendly empty state).
3. Apply semi-transparent mostly solid styling (readable, contrasting).
4. Ensure responsive sizing and scroll for long note/reference content.

**Acceptance:** panel is always visible and readable on desktop + mobile widths.

---

## Task 4 — Update `TableCard` hover and typography behavior

**File:** `src/renderer/TableCard.tsx`

### Changes

1. Remove note icon clickability:
   - delete `onNoteClick` prop and all click handlers.
   - keep note icon rendering as passive indicator.
2. Remove icon hover-highlight state and visuals (`IconHoverBorder`, hover state).
3. Add hover callbacks for parent scene:

```ts
onTableHoverChange?: (value: HoverContext | null) => void;
onColumnHoverChange?: (value: HoverContext | null) => void;
```

4. Add explicit hit meshes for header/row hover enter/leave to emit hover context.
5. Keep existing row highlight prop; adjust row highlight color to yellow token.
6. Make primary-key field names bold:
   - preferred: `fontWeight="bold"` for PK rows.
   - if unsupported, use fallback strategy from PRD.

**Acceptance:**

- Note icons do not respond to click.
- PK rows are visually bold.
- Hover events emit stable context without drag conflicts.

---

## Task 5 — Wire hover state and panel in `Scene`

**File:** `src/renderer/Scene.tsx`

### Changes

1. Remove note click flow usage for this feature path:
   - remove `activeNote` and `onNoteClick` wiring.
   - stop rendering click-open `NotePanel`/`NoteConnector`.
2. Add scene-level hover state:
   - `hoverContext: HoverContext | null`.
3. Pass hover callbacks to each `TableCard`.
4. Compute referenced table list for current hover table.
5. Render `NavigationPanel` as fixed overlay in the right side of the scene container.
6. Preserve existing `Navigate Mode` vs `Re-arrange Mode` behavior:
   - in `Re-arrange Mode`, hover panel may still show table-level context if desired, but no clickable note interactions.

**Acceptance:** panel updates on hover and clears on leave.

---

## Task 6 — Add link highlighting by hovered column

**Files:**

- `src/renderer/RelationshipLink3D.tsx`
- `src/renderer/Scene.tsx`
- `src/renderer/constants.ts`

### Changes

1. Add `isHighlighted?: boolean` prop to `RelationshipLink3D`.
2. Switch link material color to yellow when highlighted, default otherwise.
3. In `Scene`, compute link highlight flag per link using hovered table+column context.
4. Ensure highlight logic checks both source and target field-name arrays.

**Acceptance:** hovering a column highlights matching relationship tubes in yellow.

---

## Task 7 — Update color tokens and visual constants

**File:** `src/renderer/constants.ts`

### Changes

1. Introduce constants for:
   - panel background/text/accent,
   - column highlight yellow,
   - highlighted link yellow.
2. Replace hardcoded highlight colors in renderer components with shared constants.

**Acceptance:** consistent yellow highlight tone across row and links.

---

## Task 8 — Tests and headed visual evidence

**Files:**

- `tests/visual/scene.spec.ts`
- `tests/e2e/interactiveLayout.spec.ts`
- `test-evidence/hover-navigation-panel.png` (new evidence)

### Changes

1. Add/extend headed visual tests to verify:
   - right-side nav panel visible,
   - hover updates panel content,
   - hovered row yellow,
   - matching link yellow,
   - note icon click does not open note panel.
2. Keep existing interactive layout drag-mode tests passing.
3. Capture evidence screenshot via headed Playwright:
   - `test-evidence/hover-navigation-panel.png`.

**Acceptance:** `pnpm test:e2e --headed` passes and evidence file exists.

---

## Task 9 — Final validation and docs consistency

1. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:run`
   - `pnpm test:e2e --headed`
2. Ensure `PROJECT_OVERVIEW.md` is updated only if architecture actually changed.
3. Commit with conventional message, e.g.:
   - `feat(renderer): add hover navigation panel and column-based highlighting`

---

When all tasks are complete the agent should output <promise>DONE</promise>
