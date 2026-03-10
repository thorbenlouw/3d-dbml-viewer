# PRD: Project Notes Panel in 3D Scene

## Problem

DBML `Project` metadata can include a `Note`, but this high-level context is
not currently surfaced inside the 3D scene. Users lose important schema-wide
documentation unless they inspect source DBML directly.

For larger schemas, always showing long project notes can also consume too much
screen space.

## Goal

When a DBML `Project` node exists and has a `Note`, render a TableCard-like
panel in the scene (with distinct styling) that displays the project note as
Markdown, including embedded images. The panel must support minimize/unminimize
to preserve space.

## Success Criteria

| #   | Criterion                                                                     |
| --- | ----------------------------------------------------------------------------- |
| 1   | If `Project` has no `Note`, no project notes panel is rendered.               |
| 2   | If `Project` has a `Note`, one project notes panel is rendered in-scene.      |
| 3   | Panel displays project name and rendered Markdown note content.               |
| 4   | Markdown supports common formatting and images.                               |
| 5   | Minimize collapses panel to compact header with project name + down chevron.  |
| 6   | Unminimize restores full note content statefully and predictably.             |
| 7   | Panel styling is distinct from table cards but visually coherent.             |
| 8   | `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.                      |
| 9   | Headed visual verification confirms correct rendering and toggle behavior.     |

## Scope

### In Scope

- Parse/expose project note text from DBML `Project` block.
- Add render model for a single project notes panel entity.
- Render Markdown note content (including inline images).
- Add minimize/unminimize UI affordance with chevron icon.
- Add tests for conditional rendering, Markdown content, and toggle behavior.

### Out of Scope

- Editing project notes in-app.
- Persisting minimized state across page reloads.
- Full WYSIWYG Markdown feature set beyond standard renderer support.
- Arbitrary HTML injection/execution in note content.

## UX and Interaction Rules

1. Display condition:
   - Panel appears only when `project.name` exists and `project.note` is
     non-empty after trim.
2. Placement:
   - Panel appears alongside table cards in scene composition with a stable
     default position that does not block initial camera framing.
3. Visual style:
   - Distinct from table cards (different header/body treatment) but aligned to
     existing visual language.
4. Expanded state:
   - Shows project name, optional "Project Notes" label, and Markdown body.
5. Minimized state:
   - Shows compact strip containing project name and a down chevron icon
     indicating it can be expanded.
6. Toggle behavior:
   - Header/chevron click toggles minimize state.
   - State is local session UI state; defaults to expanded on first load.
7. Markdown rendering:
   - Support headings, emphasis, lists, links, code, blockquotes, and images.
   - Long content should scroll within panel bounds rather than explode layout.
8. Image handling:
   - Load remote/local image URLs allowed by existing app policies.
   - Broken images fail gracefully without crashing panel render.

## Technical Approach

### Data Model

- Extend parsed schema to include project note content if not already exposed:
  - `projectName?: string`
  - `projectNote?: string`
- Build a renderable `ProjectNoteNode` model consumed by scene components.

### Renderer Architecture

1. Add `ProjectNotesCard` (TableCard-like but separate component).
2. Integrate component in scene render pass when `projectNote` exists.
3. Add local UI state for minimized/expanded status.
4. Render Markdown via vetted markdown renderer stack and sanitized output.

### Markdown and Security

- Use markdown pipeline that avoids unsafe HTML execution by default.
- Sanitize rendered output to prevent XSS/script injection.
- Restrict/validate URL protocols (for links/images) to safe schemes.
- Keep external resource behavior explicit and test-covered.

### Performance

- Memoize parsed markdown AST/output per note content.
- Avoid rerendering heavy markdown body when unrelated scene state changes.

## Risks and Mitigations

1. Markdown/HTML security issues.
   - Mitigation: sanitize output and disable raw HTML by default.
2. Oversized notes/images hurting readability.
   - Mitigation: bounded panel dimensions + internal scrolling + image max size.
3. Scene clutter with another persistent panel.
   - Mitigation: minimized mode and compact default footprint.
4. Rendering mismatch between DOM overlays and 3D billboarding.
   - Mitigation: choose a single rendering strategy and test interaction edge
     cases (hover, focus, camera movement).

## Acceptance Tests

| #   | Scenario                                              | Expected                                                             |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | DBML with `Project` but no note                       | No project notes panel                                               |
| 2   | DBML with `Project` and note                          | Notes panel is rendered                                              |
| 3   | Expanded panel                                        | Project name + rendered markdown content visible                     |
| 4   | Note contains Markdown image                          | Image renders within size bounds                                     |
| 5   | Click minimize                                        | Panel collapses to compact header with project name + down chevron   |
| 6   | Click unminimize                                      | Full content restored                                                |
| 7   | Invalid/broken image URL                              | Graceful fallback (no crash)                                         |
| 8   | Malicious/unsafe markdown input                       | Unsafe content sanitized/not executed                                |
| 9   | `pnpm lint && pnpm typecheck`                         | No errors                                                            |
| 10  | `pnpm test:run`                                       | All tests pass                                                       |
| 11  | `pnpm test:e2e --headed` + screenshot evidence        | Panel visible and minimize toggle verified                           |

## Notes

- This change defines product and execution requirements only; no code
  implementation is included in this spec artifact.

