# AGENTS.md — AI Agent Guidance

This file tells AI coding agents how to work effectively in this repository.
Follow these conventions whenever reading, writing, or reviewing code.

---

## Project Context

This is a TypeScript/React project that parses DBML and renders an interactive
3D entity-relationship diagram. See `PROJECT_OVERVIEW.md` for architecture and
design decisions.

Key packages:

| Package               | Purpose                         |
| --------------------- | ------------------------------- |
| `@dbml/core`          | DBML parser                     |
| `d3-force-3d`         | 3D force-directed layout        |
| `@react-three/fiber`  | React renderer for Three.js     |
| `@react-three/drei`   | Three.js helpers for R3F        |
| `three`               | Underlying WebGL engine         |
| `react`               | UI shell                        |
| `tailwindcss`         | Styling                         |
| `vite`                | Build tool                      |
| `vitest`              | Unit/integration test runner    |
| `@playwright/test`    | Browser/visual end-to-end tests |
| `eslint` + `prettier` | Linting and formatting          |

---

## Code Conventions

### TypeScript

- Use strict TypeScript (`"strict": true`). Avoid `any`; prefer `unknown` with
  type guards when the shape is genuinely dynamic.
- Prefer explicit return types on exported functions and React components.
- Co-locate types with the code that owns them. Place shared cross-layer types
  in `src/types/`.

### React

- Use function components with hooks. No class components.
- Keep components small and focused on a single responsibility.
- Use `React.memo` only when profiling proves it is needed — don't pre-optimise.
- Side effects that derive from props should live in `useMemo` / `useEffect`,
  not inline in the render body.

### React Three Fiber (R3F)

- Scene components (inside `<Canvas>`) are pure 3D; keep them free of DOM
  concerns. Pass data in via props or context.
- Use `useFrame` sparingly; cache refs to avoid per-frame allocations.
- Dispose Three.js geometries and materials when components unmount.

### File naming

- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utility modules: `camelCase.ts`
- Test files: mirror the source path with a `.test.ts(x)` suffix.

### Imports

- Use absolute imports via path aliases (`@/parser`, `@/renderer`, etc.) rather
  than relative `../../../` chains.

---

## Testing

### Philosophy

Write tests that give confidence the system behaves correctly, not tests that
mirror implementation details. Prefer testing behaviour at the boundary of a
unit, not its private internals.

### Test pyramid

```
           ┌────────┐
           │  E2E   │  Playwright — full browser, happy paths + regressions
           ├────────┤
           │Integr. │  Vitest — parser → layout pipeline; component trees
           ├────────┤
           │  Unit  │  Vitest — pure functions, edge cases, error paths
           └────────┘
```

### Unit tests (`tests/unit/`)

- Every module in `src/parser/` and `src/layout/` must have corresponding unit
  tests.
- Use `describe` / `it` for readable test names that read as sentences.
- Prefer data-driven tests (`it.each`) when the same behaviour applies to many
  inputs.
- Mock external I/O only (network, file system). Do not mock internal modules.

### Integration tests (`tests/integration/`)

- Test the full `DBML text → graph → positioned nodes` pipeline end to end
  using realistic DBML fixtures stored in `tests/fixtures/`.
- Use `@testing-library/react` for component integration tests; assert on
  visible output, not internal state.

### Visual / E2E tests (`tests/visual/`)

- Use Playwright to load the app and assert structural correctness (canvas
  present, correct dimensions, Reset View button, no JS errors).
- Screenshot assertions are opt-in and stored under `tests/visual/snapshots/`.
  Run with `--update-snapshots` intentionally, never automatically.

#### WebGL rendering verification — mandatory use of Playwright MCP

**Headless Chromium cannot create a WebGL context.** `pnpm test:e2e` (headless)
can only verify DOM structure; it cannot confirm that 3D boxes are actually
visible on screen. A blank white canvas will pass the headless tests.

For agent verification loops, run Playwright in headed mode:
`pnpm test:e2e --headed`.

Whenever you implement or modify renderer components (`src/renderer/`), you
**must** verify visual output using the Playwright MCP server:

1. Ensure the dev server is running (`pnpm dev`).
2. Use the Playwright MCP `browser_navigate` + `browser_screenshot` tools to
   open `http://localhost:5173` in a headed, GPU-enabled browser.
3. Confirm in the screenshot that the expected 3D content is visible before
   committing. Save the screenshot to `test-evidence/` as evidence.

The Playwright MCP is configured in `~/.claude/settings.json` with
`--headed --allowed-origins http://localhost:5173`. Do not skip this step —
the opacity/distance calculation bug that made all boxes invisible on a white
background was only caught by manual inspection, not by the automated tests.

### Coverage

- Target ≥ 80 % line coverage on `src/parser/` and `src/layout/`.
- Do not chase coverage metrics in renderer components — visual correctness
  is better validated by visual tests.
- Coverage reports are generated on CI (`pnpm test:coverage`).

### Running tests

```bash
pnpm test              # unit + integration (watch mode in dev)
pnpm test:run          # unit + integration (CI, single pass)
pnpm test:coverage     # with coverage report
pnpm test:e2e --headed     # Playwright browser tests for local/agent verification loops
pnpm test:e2e              # Playwright browser tests (default; typically CI/headless)
```

---

## Git Workflow

- All commits must pass the pre-commit hook (ESLint + Prettier + type-check).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org):
  `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Keep commits atomic — one logical change per commit.
- Branch names: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.

---

## Environment Variables

- All environment variables are documented in `.env.example`.
- Never commit `.env` or any file containing secrets.
- Variables consumed at build time are prefixed `VITE_`.

---

## Adding a New Feature

1. Create `features/<feature-name>/PRD.md` describing the problem, success
   criteria, and acceptance tests before writing any code.
2. Write failing tests first (TDD) where practical.
3. Implement the smallest change that makes the tests pass.
4. Run `pnpm lint` and `pnpm typecheck` before committing.
5. If the feature touches `src/renderer/`, use Playwright MCP to take a
   screenshot and confirm the scene renders correctly (see Visual / E2E tests
   section above).
6. Update `PROJECT_OVERVIEW.md` if the architecture changes.

---

## What Agents Should NOT Do

- Do not add `// eslint-disable` comments to suppress warnings — fix the
  underlying issue.
- Do not use `@ts-ignore` or `@ts-expect-error` without an explanatory comment
  referencing a known upstream bug.
- Do not introduce new dependencies without checking whether an existing
  package already covers the need.
- Do not generate fake test data inline when a fixture file would be clearer
  and reusable.
- Do not delete or alter `tests/fixtures/` files without explicit instruction.
- Do not skip type generation steps after modifying shared types.

# Writing TODOs and PRDs

Write specs for each feature in its own `features/<feature-name>/PRD.md` file using best practices for PRDs.

PRDs are subsequently broken down into detailed tasks in a TODO.md file in the same directory when requested by the user.

Each TODO.md file should finish with a statement that when all tasks are complete the agent should output <promise>DONE</promise>.

This is because we use the "Ralph Wiggum" plugin and agent automation style to repeatedly run agent sessions until a whole TODO is complete, and the agent looks for the <promise>DONE</promise> statement to know when to stop iterating .
