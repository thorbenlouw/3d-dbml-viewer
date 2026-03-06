# PRD: Cosmetic Improvements

## Problem

The current UI has several small but noticeable rough edges:

- The Reset View button is isolated from the related Spacing/Zoom controls and
  overlaps the Navigation Panel.
- The Note icon on table cards is yellow (matching the sticky/focus accent) and
  unstyled, making it visually inconsistent with the boxed PK/FK/NN/UQ badges.
- Badge background boxes lack contrast against the card body colour.
- When hovering a column the Navigation Panel shows no column attribute
  information (PK, FK, etc.), making the panel less useful.
- Table card titles are rendered inside the box, reducing legibility at a
  distance and making individual tables harder to identify in a dense scene.
- The Navigation Panel heading is always "Navigation", giving no schema context.
- Empty table groups show "Ungrouped" instead of a neutral dash.
- Navigation Panel sections lack visual separation, making the panel hard to
  scan.
- Section label font is smaller than section content, creating an odd visual
  hierarchy.
- The bottom help text is the same regardless of focus state, missing an
  opportunity to hint at how to release a sticky/marker focus.

## Success Criteria

1. The Spacing, Zoom, and Reset View controls live in a single box, positioned
   to the left of and outside the Navigation Panel (above the Load File button).
2. The Note icon on table cards renders as a white badge box matching the
   PK/FK/NN/UQ style. All badge boxes use a more contrasting charcoal
   background.
3. Hovering a column shows its active attributes (PK, FK, NN, UQ) in the
   Navigation Panel; they disappear when the hover leaves the column.
4. The table name (and Note badge if set) floats above the card box in large 3D
   text with no background plane.
5. The Navigation Panel title reads the project name from the DBML `Project`
   block when one is present, otherwise "Details".
6. Table group displays "-" when no group is set (not "Ungrouped").
7. Each Navigation Panel section has a slightly darker charcoal inner panel to
   visually separate sections.
8. Section label and content text are the same font size.
9. The bottom help text changes once a sticky table or focus marker is active,
   hinting at how to release it (double-click the table/marker again).

---

## Scope

### 1. Controls panel relocation

**Current:** Spacing/Zoom box is `position: fixed, bottom: 5.7rem, right: 1rem`
(overlapping the Navigation Panel). Reset View button is separately positioned.

**Change:**

- Move the Spacing/Zoom/Reset View controls into one combined box.
- Position it `fixed, bottom: 2.5rem, left: 1rem` — above the Load File button,
  on the left side.
- Load File button moves to `bottom: 2.5rem` already; the new combined controls
  box sits directly above it. Adjust `bottom` of the controls to account for
  its own height if needed, or stack them with a gap.
- Navigation Panel `bottom` value may be reduced now that no controls overlap
  it from the right.

### 2. Note badge styling

**Current:** Note icon (`✎`) is rendered as a free-floating `<Text>` element in
yellow (`PANEL_ACCENT_COLOR`).

**Change:**

- Wrap the note icon in the same badge mesh box used for PK/FK/NN/UQ.
- Colour: white text on charcoal background (new `BADGE_BG_COLOR` value,
  e.g. `#2C3A4A` or similar high-contrast charcoal).
- Apply the same charcoal background to all other badges (PK/FK/NN/UQ).
- Note badge appears at the right end of the badge group on the header row.

### 3. Column attributes in Navigation Panel

**Current:** `HoverContext` carries no column attribute flags; the Navigation
Panel has no "Attributes" section.

**Change:**

- Add optional `columnAttributes` to `HoverContext`:
  ```ts
  columnAttributes?: {
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNotNull: boolean;
    isUnique: boolean;
  };
  ```
- Populate it in `Scene.tsx` when `onColumnHoverChange` fires, sourcing values
  from the hovered `ParsedColumn`.
- Add an "Attributes" section to `NavigationPanel` below "Hover target". Show
  active attributes as small pill badges (PK, FK, NN, UQ). Hide the section
  entirely when no column is hovered or no attributes are active.

### 4. Floating table title

**Current:** Table name is rendered as a `<Text>` mesh inside the card group,
at the header height.

**Change:**

- Move the title `<Text>` element (and the table-level note badge, if present)
  to a position above the top edge of the card box.
- Use a larger font size (e.g. `TEXT_HEADER_SIZE * 2`) for the floating title.
- Remove any opaque background plane behind the title — it should read directly
  against the scene background.
- The title should still billboard (copy camera quaternion) with the card.
- The existing `TITLE_SCALE_MAX` distance scaling remains, applied to the
  floating title group.

### 5. Project name in panel title

**Current:** `ParsedSchema` has no `projectName` field; the heading is always
"Navigation".

**Change:**

- Add optional `projectName?: string` to `ParsedSchema`.
- Populate it in the parser from the DBML `Project` block name if present.
- Pass `schema` (or just `projectName`) to `NavigationPanel`.
- Display `projectName` as the panel title when set; otherwise display
  "Details".

### 6. Table group dash for ungrouped tables

**Current:** `groupLabel` defaults to `'Ungrouped'` when
`hoverContext?.tableGroup` is nullish.

**Change:** Default to `'-'` instead of `'Ungrouped'`.

### 7. Section inner panels

**Current:** Sections are separated only by `marginBottom`.

**Change:**

- Wrap each section's content (not the label) in a `<div>` with a slightly
  darker background, e.g. `rgba(0, 0, 0, 0.25)`, `borderRadius: 0.375rem`,
  and `padding: 0.4rem 0.6rem`.

### 8. Consistent section font size

**Current:** Section labels are `0.75rem`; content is unsized (inherits ~`1rem`
or has `fontWeight` but no explicit size).

**Change:** Set all section label and content text to the same size, e.g.
`0.8rem`.

### 9. Context-sensitive help text

**Current:** Help text is always "Double-click a Table or point in space to set
and remove a fixed marker to rotate around".

**Change:**

- When `focusMode === 'none'`: keep the current message.
- When `focusMode` starts with `'sticky:'`: show "Double-click the highlighted
  table again to release the rotation anchor".
- When `focusMode === 'marker'`: show "Double-click the marker again to release
  the rotation anchor".
- Pass `focusMode` (already computed in `Scene.tsx`) down to the help text
  element.

---

## Files Affected

| File                               | Change                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `src/types/index.ts`               | Add `projectName?` to `ParsedSchema`; add `columnAttributes?` to `HoverContext` |
| `src/parser/`                      | Extract project name from DBML `Project` block                                  |
| `src/renderer/Scene.tsx`           | Relocate controls; populate `columnAttributes`; context-sensitive help text     |
| `src/renderer/NavigationPanel.tsx` | Project title; dash for no group; section panels; font size; attributes section |
| `src/renderer/TableCard.tsx`       | Floating title; note as badge; charcoal badge background                        |
| `src/renderer/constants.ts`        | New/updated badge colour constant                                               |
| `src/renderer/ResetViewButton.tsx` | Remove (inlined into combined controls box) or repurpose                        |

---

## Out of Scope

- Functional changes to camera, simulation, or interaction behaviour.
- Changes to relationship links or the FocusMarker component.
- Any new DBML parser features beyond extracting the project name.
