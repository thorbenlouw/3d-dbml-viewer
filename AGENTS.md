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

## Code Search Tools

`ast-grep` is installed and available via Bash. Use it for structural code
searches where text matching is fragile — e.g. finding all call sites of a
function regardless of formatting, detecting anti-patterns, or preparing
codemods.

Prefer `ast-grep` over `grep`/Grep when:

- The pattern spans multiple lines or involves nesting (e.g. JSX props,
  callback shapes)
- You need to match by syntax role rather than text (e.g. "all arrow functions
  returned from `useMemo`")
- You're auditing API usage across the codebase (e.g. every `useFrame` call,
  every `new BufferGeometry()`)

Example:

```bash
# Find all useFrame hooks
ast-grep --pattern 'useFrame($$$)' --lang tsx

# Find Three.js geometry constructors (to audit disposal)
ast-grep --pattern 'new $TYPE($$$)' --lang tsx src/renderer/
```

Continue using the built-in Grep tool for simple text/regex searches.

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

#### WebGL rendering verification — delegate to the human user

**Headless Chromium cannot create a WebGL context.** `pnpm test:e2e` (headless)
can only verify DOM structure; it cannot confirm that 3D boxes are actually
visible on screen. A blank white canvas will pass the headless tests.

**The agent is sandboxed and cannot launch headed browsers.** When headed E2E
tests or visual WebGL verification are required, ask the human user to run the
command below in a separate terminal. The output and screenshots are written to
`test-evidence/` so the agent can analyse them directly without the user needing
to paste anything back.

Ask the user to run:

```bash
pnpm test:e2e --headed 2>&1 | tee test-evidence/e2e-run.txt
```

Then read the results yourself:

```
Read test-evidence/e2e-run.txt          # pass/fail summary and error details
Read test-evidence/<screenshot>.png     # any screenshot saved during the run
```

Wait until the user confirms the command has finished, then read the files above
before considering the work done.

The opacity/distance calculation bug that made all boxes invisible on a white
background was only caught by visual inspection — do not skip this step for
renderer changes.

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
pnpm test:e2e              # Playwright browser tests (headless — DOM checks only)
# pnpm test:e2e --headed   # Must be run by the human user; agent cannot launch headed browsers
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

# ISSUE MANAGEMENT

This project uses a CLI ticket system for task management. Run `tk help` when you need to use it.
