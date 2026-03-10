# TODO: Project Notes Panel in 3D Scene

## Tasks

### 1. Confirm parser output for project note fields

In parser and shared types:

- Ensure `ParsedSchema` exposes:
  - `projectName?: string`
  - `projectNote?: string`
- If `projectName` already exists, add only `projectNote`.
- Trim note content and treat empty note as `undefined`.

---

### 2. Add fixtures for project-note scenarios

In `tests/fixtures/` add reusable DBML fixtures:

- `project-note-none.dbml` (Project exists without note)
- `project-note-basic.dbml` (simple markdown note)
- `project-note-markdown-image.dbml` (note with image)
- `project-note-unsafe-markdown.dbml` (unsafe payload for sanitization tests)

Do not modify unrelated existing fixture files.

---

### 3. Add a render model for project notes

In scene/layout view-model layer:

- Define a `ProjectNoteNode` (or equivalent) containing:
  - id
  - name
  - note content
  - position/dimensions metadata
- Ensure node is created only when `projectNote` exists.

---

### 4. Implement `ProjectNotesCard` component skeleton

In `src/renderer/`:

- Create `ProjectNotesCard.tsx` as a TableCard-like component with distinct
  styling.
- Accept props for name, markdown content, minimized flag, and toggle handler.
- Keep 3D/DOM boundary consistent with existing renderer architecture.

---

### 5. Add Markdown rendering pipeline

Choose/extend existing markdown tooling (without introducing unsafe raw HTML):

- Parse and render markdown content in the project notes panel.
- Support headings, lists, emphasis, links, code blocks, blockquotes, images.
- Add sanitization stage and safe URL policy for links/images.

Document any new dependency rationale if needed.

---

### 6. Add minimize/unminimize behavior

In `ProjectNotesCard` and/or scene state management:

- Add local UI state: expanded by default.
- Minimized view must show:
  - project name
  - down chevron icon indicating expandable state
- Clicking header/chevron toggles minimized state.
- Unminimize restores full markdown body.

---

### 7. Add bounded layout and scroll handling

- Constrain panel max width/height to avoid scene takeover.
- Enable internal scrolling for long notes.
- Constrain image display (`max-width`, `max-height`, preserve aspect ratio).
- Handle broken image loads without runtime errors.

---

### 8. Integrate panel into scene composition

In `src/renderer/Scene.tsx`:

- Conditionally render `ProjectNotesCard` when `schema.projectNote` exists.
- Place panel in stable default position relative to table layout/camera frame.
- Ensure no regressions in hover, focus, controls, and link rendering.

---

### 9. Add unit tests

Under `tests/unit/`:

- Parser mapping for project note extraction and empty-note behavior.
- Markdown sanitization/URL policy behavior.
- Minimize state transitions (component/state logic unit level).

---

### 10. Add integration tests

Under `tests/integration/`:

- Fixture with project note renders panel.
- Fixture without note does not render panel.
- Minimize/unminimize toggles expected content visibility.
- Markdown image and long content paths behave correctly.

---

### 11. Add/extend E2E visual checks

Under Playwright tests:

- Verify panel exists for note fixture.
- Verify minimize click collapses to compact header + chevron.
- Verify unminimize restores content.
- Verify no JS console errors from markdown/image rendering.

---

### 12. Run quality gates and collect visual evidence

Run:

```bash
pnpm lint && pnpm typecheck
pnpm test:run
pnpm test:e2e --headed
```

Save headed screenshot evidence to:

- `test-evidence/project-notes-panel.png`

---

### 13. Documentation updates

- Update `PROJECT_OVERVIEW.md` if renderer/data-flow architecture changes.
- Add concise note about project markdown rendering and safety constraints.

---

When all tasks are complete the agent should output <promise>DONE</promise>.

