# PRD: Friendlier, More Visible Colour Palette (Feature 15)

## Problem Statement

The current UI uses a hard-coded dark-blue theme that has four distinct legibility and visual warmth issues:

1. **Low inter-layer contrast** — card body (#15304A), odd rows (#1A3A58), and even rows (#1E4365) are barely distinguishable from each other or from the scene background (#0B1020). Tables look flat.
2. **Harsh yellow accent** — #facc15 (highlights, sticky borders, panel headings) is jarring against the cool blue scene and tires the eye.
3. **Washed-out links** — #92D8FF is close in brightness to card text (#F3FAFF) so relationship lines don't read as a distinct layer.
4. **Inconsistent buttons** — #1C95D3, #334155, and #1e293b are unrelated.

## Proposed Solution

Shift to a **"Deep Teal + Amber"** scheme:
- Darker, richer card faces with more contrast between layers
- Bright cyan edges that immediately identify card boundaries and relationships
- Warm amber accent replacing harsh yellow
- Cohesive button palette aligned with the card-header blue family

## Success Criteria

1. Card body, odd rows, and even rows are visually distinguishable at a glance
2. Relationship lines (links) are clearly distinct from card face colours
3. Sticky/focused tables show a warm amber border (not harsh yellow)
4. Panel headings use amber instead of yellow
5. Buttons use a cohesive blue family consistent with the card headers

## Acceptance Tests

All verified via Playwright MCP screenshot of the `insurance-data-vault` example:

- [ ] Card layers clearly distinguishable (body vs odd vs even rows)
- [ ] Relationship lines are cyan, visually distinct from card faces
- [ ] Clicking a table shows amber border (not yellow)
- [ ] Hovering a column shows amber highlight
- [ ] Panel headings are amber
- [ ] Reset View and Load File buttons look cohesive with card-header blue

## Out of Scope

- No dark/light toggle
- No CSS variable refactor
- No Tailwind config changes
- No font or layout changes
