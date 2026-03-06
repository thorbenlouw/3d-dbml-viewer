# TODO: Cosmetic Improvements

## Tasks

### 1. Add `projectName` to `ParsedSchema` and `HoverContext` column attributes

In `src/types/index.ts`:

- Add `projectName?: string` to `ParsedSchema`.
- Add `columnAttributes` to `HoverContext`:
  ```ts
  columnAttributes?: {
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNotNull: boolean;
    isUnique: boolean;
  };
  ```

---

### 2. Extract project name in the parser

In `src/parser/index.ts`:

- Extend the local `DbmlDatabase` interface with a `project` field:
  ```ts
  interface DbmlProject {
    name?: string;
  }
  interface DbmlDatabase {
    schemas: DbmlSchema[];
    project?: DbmlProject;
  }
  ```
- In `parseDatabaseSchema`, read `database.project?.name`. Trim it; use it only
  if non-empty.
- Return it as `projectName` in the `ParsedSchema` result object.

Add a unit test in `tests/unit/parser.test.ts`:

- Test with a DBML string that contains a `Project` block and assert
  `schema.projectName` equals the project name.
- Test that a DBML string without a `Project` block yields
  `schema.projectName === undefined`.

Add a fixture `tests/fixtures/with-project.dbml` containing a minimal schema
with a `Project` block for use in the test.

---

### 3. Populate `columnAttributes` in `Scene.tsx`

In the `onColumnHoverChange` callback path in `Scene.tsx`, the column hover
context is constructed inside `TableCard.tsx` via `toColumnHoverContext`. That
function currently has no access to the `ParsedColumn` attributes.

- In `src/renderer/TableCard.tsx`, update `toColumnHoverContext` to include
  `columnAttributes`:
  ```ts
  columnAttributes: {
    isPrimaryKey: column.isPrimaryKey,
    isForeignKey: column.isForeignKey,
    isNotNull: column.isNotNull,
    isUnique: column.isUnique,
  },
  ```

---

### 4. Update `NavigationPanel` — project title, dash for no group, attributes section, section panels, font size

In `src/renderer/NavigationPanel.tsx`:

**a. Accept new props:**

- Add `projectName?: string` to `NavigationPanelProps`.
- Change the `<h2>` text from `'Navigation'` to `projectName ?? 'Details'`.

**b. Ungrouped → dash:**

- Change the `groupLabel` default from `'Ungrouped'` to `'-'`.

**c. Attributes section:**

- Below the "Hover target" section add an "Attributes" section.
- Only render it when `hoverContext?.columnAttributes` is defined and at least
  one attribute is `true`.
- Display active attributes as small inline pill-style `<span>` elements with
  labels `PK`, `FK`, `NN`, `UQ` — same style as the badge boxes on the cards
  (dark background, white text, `0.75rem` font, `border-radius`).

**d. Section inner panels:**

- Wrap each section's value content (not the label) in a `<div>` with:
  `background: 'rgba(0,0,0,0.25)'`, `borderRadius: '0.375rem'`,
  `padding: '0.4rem 0.6rem'`.

**e. Consistent font size:**

- Set both section label `<p>` elements and section content `<p>`/`<ul>`
  elements to `fontSize: '0.8rem'`. Remove the `opacity: 0.8` from labels and
  instead differentiate labels with `fontWeight: 600` and content with
  `fontWeight: 400`.

---

### 5. Pass `projectName` to `NavigationPanel` in `Scene.tsx`

- `Scene.tsx` already has `schema` in scope.
- Pass `schema.projectName` to `NavigationPanel` as the new `projectName` prop.
- Do this in both the WebGL-unavailable fallback return and the main return.

---

### 6. Floating table title in `TableCard.tsx`

In `src/renderer/TableCard.tsx`:

- Remove the existing title `<Text>` element from inside the card `<group>`.
- Add a new `<group>` positioned above the card top edge:
  `position={[0, dimensions.height / 2 + 0.18, dimensions.depth / 2 + 0.01]}`.
- Inside it, render the title `<Text>` at `fontSize={TEXT_HEADER_SIZE * 2}` with
  `anchorX="center"` and `anchorY="bottom"`.
- If the table has a note, render a note badge (see task 7) immediately to the
  right of the title in this same floating group.
- Apply the same distance-based `titleScaleGroupRef` scale to this floating
  title group (move `ref={titleScaleGroupRef}` to this group).
- Remove the old `titleScaleGroupRef` group that sat inside the header.

---

### 7. Note icon as badge; charcoal badge backgrounds

In `src/renderer/constants.ts`:

- Change `BADGE_BG_COLOR` from `'#2F9FE3'` (blue) to `'#2C3A4A'` (charcoal).
- Add a new constant `NOTE_BADGE_TEXT_COLOR = '#F8FDFF'` (same white as
  `BADGE_TEXT_COLOR`).
- Remove `NOTE_HIGHLIGHT_COLOR` usage for the note icon (it will now use the
  badge colours).

In `src/renderer/TableCard.tsx`:

- Remove the free-floating `<Text>` note icon from the header area (the one
  using `NOTE_HIGHLIGHT_COLOR`).
- Add the note icon as an additional badge in the badge group on the header row,
  rendered after the PK/FK/NN/UQ badges using the same mesh + Text badge
  pattern but with `NOTE_ICON_CHAR` as its label and `NOTE_BADGE_TEXT_COLOR` as
  text colour.
- The note icon badge should only render when `node.table.note` is set.
- For column rows, replace the free-floating column note `<Text>` with the same
  badge approach.

---

### 8. Relocate controls panel to left side; inline Reset View

In `src/renderer/Scene.tsx`:

- Delete the import of `ResetViewButton` and its usage.
- Inside the existing Spacing/Zoom controls `<div>`, add a third inner section
  for "View":
  - Label: `"View"`
  - A single `<button>` styled identically to the `AdjustButton` style but full
    width (or a wider fixed width), with label `"Reset"` and `aria-label`
    `"Reset camera to overview"`, calling `handleResetView` on click.
- Change the outer controls `<div>` position from
  `right: '1rem', bottom: '5.7rem'` to `left: '1rem', bottom: '5.7rem'`
  (it already sits above the Load File button which is at `left: '1rem'`).
- Delete `src/renderer/ResetViewButton.tsx` (it is now inlined).

---

### 9. Context-sensitive help text in `Scene.tsx`

- The `focusMode` value is already computed in `Scene.tsx` as one of:
  `'none'`, `'marker'`, or `` `sticky:${tableId}` ``.
- Replace the static help string with a computed value:
  ```ts
  const helpText = useMemo(() => {
    if (focusMode === 'none') {
      return 'Double-click a Table or point in space to set and remove a fixed marker to rotate around';
    }
    if (focusMode === 'marker') {
      return 'Double-click the marker again to release the rotation anchor';
    }
    return 'Double-click the highlighted table again to release the rotation anchor';
  }, [focusMode]);
  ```
- Use `{helpText}` in the bottom help bar `<div>`.

---

### 10. Run lint and typecheck

```
pnpm lint && pnpm typecheck
```

Fix any reported errors before proceeding.

---

### 11. Run unit and integration tests

```
pnpm test:run
```

Fix any test that breaks due to:

- `ParsedSchema` shape change (`projectName` field).
- `HoverContext` shape change (`columnAttributes` field).
- `NavigationPanel` prop changes.

---

### 12. Visual verification via Playwright MCP

- Ensure `pnpm dev` is running.
- Use Playwright MCP `browser_navigate` + `browser_screenshot` to open
  `http://localhost:5173`.
- Confirm in the screenshot:
  - Spacing/Zoom/Reset controls are on the left side above Load File.
  - No controls overlap the Navigation Panel.
  - Table titles float above their card boxes.
  - Badge boxes are charcoal (not blue).
  - Navigation Panel title is "Details" (no Project block in the default schema).
- Save screenshot to `test-evidence/cosmetic-improvements.png`.

---

When all tasks above are complete, output <promise>DONE</promise>.
