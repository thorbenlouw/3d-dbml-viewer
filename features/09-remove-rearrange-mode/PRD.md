# PRD: Remove Rearrange Mode

## Problem

The UI currently shows a "Navigate Mode / Re-arrange Mode" toggle button in the
bottom-right corner. Rearrange Mode allowed users to drag table cards to
reposition them by disabling OrbitControls and enabling pointer-drag handlers
on each card.

Rearrange Mode is no longer a supported interaction. Navigate Mode is now the
only mode. The toggle button is therefore meaningless UI noise and the dead code
behind it adds unnecessary complexity to `Scene.tsx`, `TableCard.tsx`, and
`useDragCard.ts`.

## Goal

Remove the mode toggle button from the UI and delete all code that exists
solely to support the Rearrange Mode interaction. The viewer should behave
exactly as it does today when in Navigate Mode, with no visible or functional
change beyond the absence of the toggle button.

## Navigation Help Message

With the mode toggle gone, users have no in-app hint that double-clicking a
table header or empty space activates focus behaviour. Add a static help line
at the very bottom of the screen:

> Double-click a Table or point in space to set and remove a fixed marker to rotate around

The message should be unobtrusive — small, low-contrast text — and must not
obscure any interactive controls.

## Out of Scope

- Introducing any replacement drag interaction.
- Changes to spacing/zoom controls, reset view, load file, or any other UI.

## Success Criteria

1. The "Navigate Mode / Re-arrange Mode" toggle button is gone from the UI.
2. A help line reading "Double-click a Table or point in space to set and remove
   a fixed marker to rotate around" is visible at the bottom of the screen.
3. Double-clicking a table header still activates sticky focus (as it did in
   Navigate Mode).
4. Double-clicking empty space still places the focus marker.
5. OrbitControls (pan, orbit, scroll-zoom) remain fully functional at all times.
6. No dead `isRearrangeMode` state, props, or conditional branches remain in the
   codebase.
7. `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` all pass.
8. A Playwright MCP screenshot confirms the scene renders correctly with the
   help line and without the toggle button.

## Acceptance Tests

| #   | Scenario                      | Expected                                                                                                 |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Open the app                  | No toggle button visible; help line is visible at the bottom                                             |
| 2   | Help line text                | Reads exactly "Double-click a Table or point in space to set and remove a fixed marker to rotate around" |
| 3   | Double-click a table header   | Sticky focus activates (camera flies to table)                                                           |
| 4   | Double-click empty space      | Focus marker appears                                                                                     |
| 5   | Orbit / pan / scroll          | Camera responds normally                                                                                 |
| 6   | `pnpm test:run`               | All tests green                                                                                          |
| 7   | `pnpm lint && pnpm typecheck` | No errors                                                                                                |
