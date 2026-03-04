# PRD — Initial Project Scaffold

| Field            | Value                 |
| ---------------- | --------------------- |
| **Feature**      | Initial Project Setup |
| **Status**       | Draft                 |
| **Author**       | —                     |
| **Last updated** | 2026-03-04            |

---

## 1. Problem Statement

Before any product functionality can be built or tested, the repository needs a
consistent, reproducible development environment. Without it, engineers face
onboarding friction, inconsistent builds, unguarded commits, and no shared
quality baseline.

This work establishes that foundation so all subsequent feature development
starts from a clean, well-guarded scaffold.

---

## 2. Goals

- Any engineer can clone the repo and be running the dev server within **one
  command** after installing Node.js.
- All code quality checks (lint, format, type-check) run automatically before
  a commit can land.
- The project structure clearly communicates where different kinds of code live.
- CI will have everything it needs to run tests and build the app in a clean
  environment.
- Create a devcontainer for VS Code that sets up the environment with zero local configuration, and allows "yolo" mode for AI coding agents but keeps things secure.

## 3. Non-Goals

- No product features (parser, layout, renderer) are implemented here.
- No deployment pipeline — that is a separate feature.
- No monorepo tooling — this is a single-package project for now.

---

## 4. Success Criteria

The feature is complete when all of the following are true:

| #   | Criterion                                                                                                                                                                          | How to verify                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `pnpm install && pnpm dev` starts the Vite dev server with a placeholder page                                                                                                      | Manual                                                                    |
| 2   | `pnpm build` produces a production bundle in `dist/` with no TypeScript errors                                                                                                     | `pnpm build` exits 0                                                      |
| 3   | `pnpm lint` reports no errors on the scaffold code                                                                                                                                 | `pnpm lint` exits 0                                                       |
| 4   | `pnpm typecheck` reports no errors                                                                                                                                                 | `pnpm typecheck` exits 0                                                  |
| 5   | `pnpm test:run` runs (even with zero tests) and exits 0                                                                                                                            | CI log                                                                    |
| 6   | A `git commit` that violates lint or type rules is **rejected** by the pre-commit hook                                                                                             | Test by committing a deliberate lint error                                |
| 7   | `.env.example` documents all expected environment variables                                                                                                                        | Code review                                                               |
| 8   | `README.md` contains setup instructions sufficient for a new engineer                                                                                                              | Code review                                                               |
| 9   | `.gitignore` excludes `node_modules`, `dist`, `.env`, and editor artefacts                                                                                                         | `git status` after build                                                  |
| 10  | Directory structure matches the layout in `PROJECT_OVERVIEW.md`                                                                                                                    | Code review                                                               |
| 11  | Opening the repo in VS Code triggers "Reopen in Container"; the container builds without errors and `pnpm dev` starts the Vite dev server inside it with no additional local setup | Manual                                                                    |
| 12  | Claude Code running inside the devcontainer operates in yolo mode (no per-action permission prompts) and can execute all `pnpm` scripts without intervention                       | Manual — run `claude --dangerously-skip-permissions` inside the container |
| 13  | The devcontainer does **not** mount the host Docker socket, does not run privileged, and the container user is non-root                                                            | `docker inspect` on the running container                                 |

---

## 5. Scope

### 5.1 Package Manager & Runtime

- **pnpm** (v9+) as the package manager. Lockfile committed.
- **Node.js** version pinned via `.nvmrc` / `engines` field in `package.json`.

### 5.2 Build Tooling

- **Vite** (v5+) as the bundler and dev server.
- **TypeScript** (v5+) configured with strict mode.
  - `tsconfig.json` — base config used by the IDE.
  - `tsconfig.build.json` — extends base, excludes test files, used by `pnpm build`.
- Path aliases configured in both `tsconfig.json` and `vite.config.ts`:
  - `@/` → `src/`

### 5.3 Directory Layout

```
3d-dbml-viewer/
├── .devcontainer/
│   ├── devcontainer.json # VS Code devcontainer configuration
│   └── Dockerfile        # Container image definition
├── src/
│   ├── parser/
│   ├── layout/
│   ├── renderer/
│   ├── ui/
│   ├── hooks/
│   ├── types/
│   └── main.tsx          # App entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── visual/
│   └── fixtures/
├── features/
│   └── initial-project-setup/
│       └── PRD.md        # this file
├── public/
├── .env.example
├── .nvmrc
├── .gitignore
├── AGENTS.md
├── PROJECT_OVERVIEW.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── prettier.config.js
└── .husky/
    └── pre-commit
```

Each `src/` subdirectory gets a placeholder `index.ts` exporting an empty
object so the directory structure is immediately visible.

### 5.4 Linting & Formatting

- **ESLint** (v9, flat config) with:
  - `eslint-config-prettier` (disables formatting rules that conflict with Prettier)
  - `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`
  - `eslint-plugin-react` + `eslint-plugin-react-hooks`
  - `eslint-plugin-jsx-a11y`
- **Prettier** for formatting (`.ts`, `.tsx`, `.json`, `.md`, `.css`).
- Both tools should be runnable independently:
  - `pnpm lint` — ESLint check
  - `pnpm format` — Prettier write
  - `pnpm format:check` — Prettier check (used in CI)

### 5.5 Type Checking

- `pnpm typecheck` runs `tsc --noEmit` using `tsconfig.json`.
- This is separate from the build step so it can be run cheaply in watch mode.

### 5.6 Testing Framework

- **Vitest** for unit and integration tests.
  - `vitest.config.ts` extends `vite.config.ts` to share aliases.
  - Test environment: `jsdom` (needed for React component tests).
  - Coverage provider: `v8`.
- **@testing-library/react** + `@testing-library/user-event` installed.
- **Playwright** installed and configured for `tests/visual/`.
- A single smoke test (`tests/unit/smoke.test.ts`) that asserts `true === true`
  is included to verify the test runner works.

### 5.7 Pre-commit Hooks

- **Husky** manages Git hooks.
- **lint-staged** runs checks only on staged files for speed.
- Pre-commit hook runs, in order:
  1. `prettier --write` on staged `.ts`, `.tsx`, `.json`, `.md` files.
  2. `eslint --fix` on staged `.ts`, `.tsx` files.
  3. `tsc --noEmit` (full project check — staged-file tsc is unreliable).
- The hook exits non-zero on any failure, blocking the commit.
- Setup is automated via the `prepare` script in `package.json`
  (`"prepare": "husky"`), so it runs on `pnpm install`.

### 5.8 npm Scripts

| Script          | Command                                    | Description                              |
| --------------- | ------------------------------------------ | ---------------------------------------- |
| `dev`           | `vite`                                     | Start dev server                         |
| `build`         | `tsc -p tsconfig.build.json && vite build` | Production build                         |
| `preview`       | `vite preview`                             | Preview production build locally         |
| `lint`          | `eslint .`                                 | Run ESLint                               |
| `lint:fix`      | `eslint . --fix`                           | Run ESLint with auto-fix                 |
| `format`        | `prettier --write .`                       | Format all files                         |
| `format:check`  | `prettier --check .`                       | Check formatting (CI)                    |
| `typecheck`     | `tsc --noEmit`                             | Type-check without emitting              |
| `test`          | `vitest`                                   | Run tests in watch mode                  |
| `test:run`      | `vitest run`                               | Run tests once (CI)                      |
| `test:coverage` | `vitest run --coverage`                    | Run with coverage report                 |
| `test:e2e`      | `playwright test`                          | Run Playwright tests                     |
| `prepare`       | `husky`                                    | Install Git hooks (runs on pnpm install) |

### 5.9 Environment Variables

`.env.example` documents all variables. Initially empty beyond a comment block.
Variables will be added as features require them. All runtime variables exposed
to the browser must be prefixed `VITE_`.

### 5.10 README

`README.md` must include:

- One-line project description.
- Prerequisites (Node version, pnpm).
- Quick-start steps (`git clone`, `pnpm install`, `pnpm dev`).
- Available scripts table (mirrors §5.8).
- Link to `PROJECT_OVERVIEW.md` and `AGENTS.md`.

### 5.11 Devcontainer

A `.devcontainer/` configuration enables any engineer (or AI coding agent) to work inside a fully pre-configured, isolated container with a single VS Code prompt.

#### `.devcontainer/Dockerfile`

- Base image: `mcr.microsoft.com/devcontainers/javascript-node:<lts-version>` (matches `.nvmrc`).
- Installs `pnpm` globally at the version specified in `package.json#packageManager`.
- Installs Playwright browser dependencies (`playwright install --with-deps chromium`) so E2E tests run without extra setup.
- Container user: the pre-existing non-root `node` user provided by the base image (uid 1000). No `--privileged` flag; no host Docker socket mount.

#### `.devcontainer/devcontainer.json`

- `postCreateCommand`: `pnpm install` — dependencies are ready the moment the container starts.
- Forwarded ports: `5173` (Vite dev server), `4173` (Vite preview).
- VS Code extensions pre-installed:
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `ms-vscode.vscode-typescript-next`
  - `bradlc.vscode-tailwindcss`
  - `GitHub.copilot` (optional, users may remove)
- VS Code settings baked in: `editor.formatOnSave: true`, `editor.defaultFormatter: "esbenp.prettier-vscode"`.

#### Yolo mode for AI coding agents

When Claude Code (or another AI agent) runs inside the devcontainer it should operate without per-action permission prompts so it can execute tool calls autonomously. This is safe because the container boundary provides the security isolation that would otherwise come from the host OS.

- `devcontainer.json` sets the environment variable `CLAUDE_CODE_SKIP_PERMISSIONS=1` so that Claude Code skips the interactive permission UI automatically when launched inside the container.
- Alternatively, agents may be launched with `claude --dangerously-skip-permissions`; document this in `AGENTS.md`.
- The container must **not** expose this permissive surface to the host: no host Docker socket, no privileged flag, no host network mode. The blast radius of any agent action is limited to the container volume.

---

## 7. Dependencies

No blockers. This feature is the foundation for all others.

---

## 8. Risks & Mitigations

| Risk                                                     | Likelihood | Impact | Mitigation                                               |
| -------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------- |
| `@dbml/core` has peer-dependency conflicts with React 19 | Low        | Medium | Pin compatible versions; document in README              |
| Playwright install requires system browser deps in CI    | Medium     | Low    | Document browser install step; use `--with-deps` flag    |
| Full `tsc` in pre-commit is slow on large codebases      | Low (now)  | Medium | Switch to `tsc --incremental` if it becomes a pain point |

---

## 9. Acceptance Tests

These map directly to the success criteria in §4 and serve as the handover
checklist:

- [ ] Clone repo to a clean directory; run `pnpm install && pnpm dev`; browser
      shows placeholder page at `localhost:5173`.
- [ ] Introduce a deliberate TypeScript error; run `pnpm typecheck`; command
      exits non-zero with a clear error message.
- [ ] Introduce a deliberate lint violation; attempt `git commit`; commit is
      blocked with a lint error in the terminal.
- [ ] Run `pnpm test:run`; all tests pass (smoke test included).
- [ ] Run `pnpm build`; `dist/` directory is created; no errors.
- [ ] Confirm `dist/`, `.env`, and `node_modules` do not appear in
      `git status`.
