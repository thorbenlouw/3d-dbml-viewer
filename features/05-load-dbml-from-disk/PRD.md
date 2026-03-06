# PRD — Load DBML File from Local Disk

## Problem

The viewer currently renders a single static DBML schema hardcoded into the
application source. Users cannot load their own schemas without modifying the
code and rebuilding. This makes the tool useful only as a demo, not as a
practical utility for exploring real projects.

## Goals

1. **File picker button** — a clearly labelled UI button opens the browser's
   native file picker, restricted to `.dbml` files.
2. **Render the loaded schema** — once a file is selected, the app parses and
   renders it in place of whatever was previously displayed.
3. **Error feedback** — if the file cannot be parsed (invalid DBML), the app
   shows an inline error message rather than crashing or silently failing.
4. **Example library** — an `examples/` directory in the repo contains 3–4
   DBML projects of varying complexity, so users have ready-made schemas to
   try and so E2E tests have deterministic fixtures.
5. **Tested examples** — E2E tests verify that each example file loads and
   renders without error.

## Non-Goals

- Drag-and-drop file loading (future enhancement).
- Loading DBML from a URL or remote source.
- Persisting the loaded schema across page reloads.
- A schema text editor inside the app.
- Loading multiple files simultaneously.

## Success Criteria

| #   | Criterion                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A "Load DBML File" button is visible in the UI at all times.                                                                                     |
| 2   | Clicking the button opens the OS file picker filtered to `.dbml`.                                                                                |
| 3   | Selecting a valid `.dbml` file replaces the current diagram with the parsed schema.                                                              |
| 4   | A parse error displays a human-readable message; no JS exception reaches the console.                                                            |
| 5   | `examples/` contains four DBML files covering small, medium, large, and multi-schema complexity tiers.                                           |
| 6   | An E2E test for each example file confirms: the file loads, no error banner appears, and the canvas contains the expected number of table nodes. |
| 7   | All existing unit, integration, and E2E tests continue to pass.                                                                                  |
| 8   | Visual correctness verified with Playwright MCP screenshot for at least the large example.                                                       |

## Example Files

| File                             | Tables | Refs | Complexity tier                         |
| -------------------------------- | ------ | ---- | --------------------------------------- |
| `examples/blog.dbml`             | ~4     | ~3   | Small — sanity check                    |
| `examples/ecommerce.dbml`        | ~10    | ~10  | Medium — typical project                |
| `examples/saas-platform.dbml`    | ~20    | ~22  | Large — real-world density              |
| `examples/multi-schema-erp.dbml` | ~30    | ~30  | Multi-schema — tests namespace handling |

Each file should be realistic, self-consistent DBML with notes on tables and
fields to exercise the full rendering pipeline (headers, field rows, note
popups, relationship links).

## Design Decisions

### Button placement

The "Load DBML File" button lives in the existing HUD toolbar (top-right
overlay). It sits alongside the Reset View button so all controls are in one
place. Label: **"Load file…"** (ellipsis signals the action opens a dialog).

### State management

The currently-displayed schema is lifted into a top-level `App` component state
variable (`currentSchema: ParsedSchema | null`). On first load the app renders
the `blog.dbml` example as the default so the canvas is never blank. When the
user loads a new file, `currentSchema` is replaced and the entire scene
re-initialises (force simulation restarts with the new graph).

### File reading

Use the browser `FileReader` API (no server required). Read as text, pass to
the existing `parseDbml()` function. Wrap in try/catch to surface parse errors.

### Error display

An error banner appears below the toolbar: red background, white text, the
parser's error message. It disappears automatically when a new file is
successfully loaded.

### Default schema on startup

On first render, load `blog.dbml` (bundled as a static asset in `public/examples/`)
so the app is immediately useful without requiring the user to load a file.
This replaces the current hardcoded static schema string.

## Acceptance Tests (Playwright)

1. Navigate to `http://localhost:5173`.
2. Assert the canvas is present and the default `blog.dbml` diagram is visible
   (table count ≥ 4).
3. Click "Load file…"; use `page.setInputFiles` to inject each example file in
   turn; assert no error banner and the canvas re-renders with the correct table
   count.
4. Inject a deliberately malformed `.dbml` file; assert the error banner
   appears with a non-empty message.
5. Load a valid file after the error; assert the error banner disappears.
6. Screenshot saved to `test-evidence/load-dbml-from-disk.png`.
