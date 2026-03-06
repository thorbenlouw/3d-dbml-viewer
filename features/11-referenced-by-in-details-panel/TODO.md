# TODO: Referenced By In Details Panel

## Tasks

### 1. Add "referenced by" shape to UI hover data

In `src/types/index.ts`:

- Extend the hover/details context type to support inbound references:
  - `referencedByFields?: string[]` for field hover (`table.column` values).
  - `referencedByTables?: string[]` for table hover (table names).
- Keep these optional so existing flows do not break.

---

### 2. Compute inbound references from relationship data

In renderer data preparation (likely `src/renderer/Scene.tsx` and/or helper
module):

- Build inverse maps from existing parsed references:
  - target field key -> set of referencing `table.column`
  - target table key -> set of referencing table names
- Include same-table/self references when present.
- Deduplicate via `Set`, then convert to alphabetically sorted arrays for UI.

---

### 3. Populate hover context with inbound reference info

When hover context is assembled for:

- Field hover: attach `referencedByFields` from the inverse field map.
- Table hover: attach `referencedByTables` from the inverse table map.

Do not attach empty arrays; prefer `undefined` when no inbound references exist.

---

### 4. Render "Referenced By" in the Details panel

In `src/renderer/NavigationPanel.tsx`:

- Add a new section titled `Referenced By`.
- Place it directly below the current "Referenced fields" / "Referenced Table"
  section.
- Field hover rendering:
  - If `referencedByFields` exists and has values, render as list items.
- Table hover rendering:
  - If `referencedByTables` exists and has values, render as list items.
- Hide the section entirely when both are empty/undefined.

---

### 5. Preserve existing details behavior

- Verify existing outbound reference sections still show exactly as before.
- Ensure no regressions for non-referenced fields/tables.

---

### 6. Add/Update tests

Add or extend tests (unit/integration) to cover:

- Field inbound references (same table and cross-table).
- Table inbound references (unique table names only).
- Empty inbound state hides "Referenced By".
- Existing outbound reference content remains unchanged.

Recommended files:

- `tests/unit/...` for mapping/inversion logic.
- `tests/integration/...` or component tests for Details panel rendering.

---

### 7. Run validation checks

Run:

```bash
pnpm lint && pnpm typecheck
pnpm test:run
```

Fix any failures before considering the feature complete.

---

### 8. Visual verification via headed Playwright

- Start app: `pnpm dev`
- Run headed e2e check: `pnpm test:e2e --headed`
- Capture evidence screenshot showing "Referenced By" in the Details panel.
- Save screenshot to `test-evidence/referenced-by-details-panel.png`.

---

When all tasks are complete, output <promise>DONE</promise>.
