# TODO — Load DBML File from Local Disk

Reference spec: `features/05-load-dbml-from-disk/PRD.md`

---

## Task 1 — Create example DBML files

**Directory:** `examples/`

Create four DBML files covering the complexity tiers described in the PRD.
Each file must be valid, self-consistent DBML with realistic column types,
primary keys, foreign key `ref` declarations, and at least one `note` per
table so the full rendering pipeline (header, fields, notes, links) is
exercised.

### `examples/blog.dbml`

Tables: `users`, `posts`, `comments`, `tags`, `post_tags`
Refs: `posts.author_id → users.id`, `comments.post_id → posts.id`,
`comments.author_id → users.id`, `post_tags.post_id → posts.id`,
`post_tags.tag_id → tags.id`
Notes: at least one note on `users` and `posts`.

### `examples/ecommerce.dbml`

Tables: `customers`, `addresses`, `products`, `categories`, `product_categories`,
`orders`, `order_items`, `payments`, `reviews`, `coupons`
Refs: full FK graph connecting the above (~10 refs).
Notes: at least one note per table.

### `examples/saas-platform.dbml`

Tables: ~20 covering auth/identity, billing, workspaces, team membership,
feature flags, audit log, notifications, integrations, webhooks,
API keys, usage metrics.
Refs: ~22 connecting the tables.
Notes: table-level and column-level notes throughout.

### `examples/multi-schema-erp.dbml`

Use two DBML `Project`/schema namespaces (e.g. `hr` and `finance`):
Tables: ~30 total — employees, departments, payroll, leave, contracts (hr);
accounts, invoices, line_items, budgets, cost_centres, journals (finance);
plus a `shared` schema for currencies, countries, audit.
Refs: ~30 cross-schema and within-schema FK refs.
Notes: multi-line notes on at least five tables.

**Acceptance:** All four files parse without error when fed to the existing
`parseDbml()` function (verified by the integration test in Task 5).

---

## Task 2 — Serve examples as static assets

**Files:**

- Copy (or symlink) `examples/*.dbml` into `public/examples/` so Vite serves
  them at `/examples/*.dbml` in both dev and production builds.
- Update `vite.config.ts` if any explicit `publicDir` or asset inclusion is
  needed (it should not be — Vite serves `public/` automatically).

**Acceptance:** `http://localhost:5173/examples/blog.dbml` returns the file
contents when the dev server is running.

---

## Task 3 — Replace hardcoded schema with default-load in `App.tsx`

**File:** `src/App.tsx` (or wherever the top-level schema string currently lives)

### Changes

1. Add state: `const [schema, setSchema] = useState<ParsedSchema | null>(null)`.
2. Add state: `const [loadError, setLoadError] = useState<string | null>(null)`.
3. On mount (`useEffect([], [])`), fetch `/examples/blog.dbml`, parse with
   `parseDbml()`, and call `setSchema(result)`. On parse failure set
   `setLoadError(message)`.
4. Replace the hardcoded `parseDbml(STATIC_DBML_STRING)` call with the state
   value. Render `null` (or a loading spinner) while `schema` is `null`.
5. Export a `handleSchemaLoad(text: string)` callback that:
   - Calls `parseDbml(text)`.
   - On success: `setSchema(result); setLoadError(null)`.
   - On failure: `setLoadError(errorMessage)` (do not update schema).
6. Pass `handleSchemaLoad` down to the toolbar component (Task 4).

**Acceptance:** The app loads and renders the `blog.dbml` diagram on startup;
`pnpm typecheck` and `pnpm lint` pass.

---

## Task 4 — Add `LoadFileButton` component to the toolbar

**Files:**

- `src/ui/LoadFileButton.tsx` (new)
- `src/ui/Toolbar.tsx` (or equivalent HUD overlay — modify to include the new
  button)

### `LoadFileButton.tsx`

```tsx
interface LoadFileButtonProps {
  onLoad: (text: string) => void;
}
```

Behaviour:

1. Render a `<button>` labelled **"Load file…"** styled consistently with the
   existing Reset View button (Tailwind classes).
2. Hidden `<input type="file" accept=".dbml" />` wired to the button via a
   `useRef`.
3. On `input` `change` event: read the selected file with `FileReader.readAsText`,
   then call `props.onLoad(text)`.
4. Reset the input value after each load so the same file can be re-selected.

### Toolbar update

Add `<LoadFileButton onLoad={handleSchemaLoad} />` beside the Reset View button.

**Acceptance:** Button is visible; clicking it opens the OS file picker;
selecting a `.dbml` file triggers `onLoad`; `pnpm typecheck` and `pnpm lint`
pass.

---

## Task 5 — Add `ErrorBanner` component

**File:** `src/ui/ErrorBanner.tsx` (new)

```tsx
interface ErrorBannerProps {
  message: string | null;
}
```

Behaviour:

- When `message` is `null`, render nothing.
- When non-null, render a fixed-position banner below the toolbar: red
  background (`bg-red-600`), white text, the message string, and an `×` close
  button that is not wired to state (the banner clears automatically on next
  successful load per Task 3, step 5).
- Add a `data-testid="error-banner"` attribute for Playwright targeting.

Mount `<ErrorBanner message={loadError} />` in `App.tsx`.

**Acceptance:** Injecting a malformed DBML string via `handleSchemaLoad` causes
the banner to appear with the parser error text; loading a valid file clears it;
`pnpm typecheck` and `pnpm lint` pass.

---

## Task 6 — Unit tests for new UI components

**Files:**

- `tests/unit/LoadFileButton.test.tsx`
- `tests/unit/ErrorBanner.test.tsx`

### `LoadFileButton.test.tsx`

- Renders a button with label "Load file…".
- Simulating a file selection calls `onLoad` with the file text.
- After calling `onLoad`, the input value is reset to `""`.

### `ErrorBanner.test.tsx`

- When `message` is `null`, renders nothing.
- When `message` is a string, renders the message text.
- Renders `data-testid="error-banner"` when visible.

Use `@testing-library/react`. Mock `FileReader` via `vi.stubGlobal` or a
custom factory.

**Acceptance:** `pnpm test:run` passes.

---

## Task 7 — Integration test: all four example files parse correctly

**File:** `tests/integration/exampleFiles.test.ts`

For each file in `['blog', 'ecommerce', 'saas-platform', 'multi-schema-erp']`:

- Read the file from `../../examples/<name>.dbml` using Node `fs.readFileSync`.
- Call `parseDbml(text)`.
- Assert no exception is thrown.
- Assert `result.tables.length` matches the expected count from the PRD table.
- Assert `result.refs.length` is greater than zero.

Use `it.each` for the four cases.

**Acceptance:** `pnpm test:run` passes with all four examples.

---

## Task 8 — E2E tests: load each example via the UI

**File:** `tests/e2e/loadDbmlFromDisk.spec.ts`

Steps:

1. Navigate to `http://localhost:5173`.
2. Assert canvas is present (existing check).
3. Assert no `data-testid="error-banner"` is visible.
4. For each example file (`blog`, `ecommerce`, `saas-platform`,
   `multi-schema-erp`):
   a. Use `page.locator('input[type="file"]').setInputFiles(...)` with the
   path to the example file.
   b. Wait for the canvas to re-render (wait for no loading state or a short
   `waitForTimeout`).
   c. Assert `data-testid="error-banner"` is not visible.
5. Inject a `bad.dbml` fixture containing deliberately invalid DBML (store at
   `tests/fixtures/bad.dbml`).
   a. Set input files to `bad.dbml`.
   b. Assert `data-testid="error-banner"` is visible with non-empty text.
6. Load `blog.dbml` again; assert the error banner disappears.
7. Save screenshot to `test-evidence/load-dbml-from-disk.png`.

**Acceptance:** `pnpm test:e2e --headed` passes for all steps.

---

## Task 9 — Visual verification with Playwright MCP

1. Ensure `pnpm dev` is running.
2. Use Playwright MCP `browser_navigate` to open `http://localhost:5173`.
3. Confirm the default `blog.dbml` diagram is visible in the screenshot.
4. Use `browser_screenshot` after loading `saas-platform.dbml` to confirm the
   large diagram renders without blank canvas.
5. Save screenshot to `test-evidence/load-dbml-from-disk.png`.

---

## Task 10 — Final cleanup

- Run `pnpm lint` and fix any new warnings.
- Run `pnpm typecheck`.
- Run `pnpm test:run` — all tests must pass.
- Run `pnpm test:e2e --headed` — all E2E tests must pass.
- Commit with message:
  `feat(ui): load arbitrary DBML file from local disk with example library`

---

When all tasks are complete the agent should output <promise>DONE</promise>
