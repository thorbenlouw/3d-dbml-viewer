# TODO — Initial Project Scaffold

Work plan derived from `PRD.md`. Tasks are ordered so each step builds on the
last. Complete them in sequence; the success criteria from §4 of the PRD map to
the verification steps at the end.

---

## 1. Bootstrap `package.json`

- [ ] Run `pnpm init` at the repo root to generate a minimal `package.json`.
- [ ] Set `"name": "3d-dbml-viewer"`, `"private": true`, `"type": "module"`.
- [ ] Add `"engines": { "node": ">=22.0.0", "pnpm": ">=9.0.0" }` (align with
      `.nvmrc` in step 2).
- [ ] Add `"packageManager": "pnpm@9.x.x"` (use the current stable 9.x release;
      this is the version the Dockerfile will pin).

---

## 2. Pin Node Version

- [ ] Create `.nvmrc` at the repo root containing `22` (or the specific LTS
      patch, e.g. `22.14.0`).
- [ ] Verify `node --version` matches inside the project before continuing.

---

## 3. Install Production & Dev Dependencies

Run one `pnpm add` pass for each group. This creates `pnpm-lock.yaml`.

### 3a. Runtime dependencies

```
pnpm add react react-dom
pnpm add @dbml/core
pnpm add three @react-three/fiber @react-three/drei
pnpm add d3-force-3d
```

### 3b. Build & type stubs

```
pnpm add -D vite @vitejs/plugin-react
pnpm add -D typescript
pnpm add -D @types/react @types/react-dom @types/three
pnpm add -D @types/d3-force-3d        # if available; otherwise declare locally
```

### 3c. Linting & formatting

```
pnpm add -D eslint
pnpm add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
pnpm add -D eslint-plugin-jsx-a11y
pnpm add -D eslint-config-prettier
pnpm add -D prettier
```

### 3d. Testing

```
pnpm add -D vitest @vitest/coverage-v8
pnpm add -D jsdom @testing-library/react @testing-library/user-event
pnpm add -D @playwright/test
```

### 3e. Git hooks

```
pnpm add -D husky lint-staged
```

- [ ] After all installs, commit `package.json` + `pnpm-lock.yaml` before
      touching any config files.

---

## 4. TypeScript Configuration

### 4a. `tsconfig.json` (IDE + typecheck)

- [ ] Create `tsconfig.json` with:
  - `"strict": true`
  - `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
  - `"jsx": "react-jsx"`
  - `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
  - `"paths": { "@/*": ["./src/*"] }`
  - `"include": ["src", "tests"]`
  - `"exclude": ["node_modules", "dist"]`

### 4b. `tsconfig.build.json` (production build)

- [ ] Create `tsconfig.build.json` extending `./tsconfig.json` with:
  - `"exclude": ["node_modules", "dist", "tests"]` (strips test files from
    build type-checking)

---

## 5. Vite Configuration

- [ ] Create `vite.config.ts`:
  - Use `@vitejs/plugin-react`.
  - Configure `resolve.alias` so `@/` → `/src/`.
  - Set `build.outDir: "dist"`.
  - Keep `root` as default (project root).
- [ ] Add `index.html` at the repo root (Vite's default entry point) with a
      `<div id="root"></div>` and a `<script type="module" src="/src/main.tsx">`.

---

## 6. Directory Structure & Placeholder Files

Create every directory and placeholder file listed in PRD §5.3.

### 6a. `src/` placeholders

For each subdirectory, create an `index.ts` exporting an empty object:

- [ ] `src/parser/index.ts`
- [ ] `src/layout/index.ts`
- [ ] `src/renderer/index.ts`
- [ ] `src/ui/index.ts`
- [ ] `src/hooks/index.ts`
- [ ] `src/types/index.ts`

### 6b. App entry point

- [ ] `src/main.tsx` — minimal React 18 `createRoot` mount that renders a
      placeholder `<App />` component showing "3D DBML Viewer — coming soon".
- [ ] `src/App.tsx` — the placeholder component (can be a single `<h1>`).

### 6c. `tests/` directories

Create empty `.gitkeep` files so the directories are tracked by git:

- [ ] `tests/unit/.gitkeep`
- [ ] `tests/integration/.gitkeep`
- [ ] `tests/visual/.gitkeep`
- [ ] `tests/fixtures/.gitkeep`

### 6d. `public/` directory

- [ ] `public/.gitkeep` (Vite serves this as static assets).

---

## 7. ESLint Configuration (flat config)

- [ ] Create `eslint.config.js` using the v9 flat config format.
- [ ] Include:
  - `@typescript-eslint` recommended rules.
  - `eslint-plugin-react` + `eslint-plugin-react-hooks` recommended rules.
  - `eslint-plugin-jsx-a11y` recommended rules.
  - `eslint-config-prettier` last, to disable formatting rules.
  - Set `languageOptions.parser` to `@typescript-eslint/parser` for `.ts` /
    `.tsx` files.
  - Ignore `dist/`, `node_modules/`, `*.config.js` (to avoid linting config
    files with strict TS rules).
- [ ] Run `pnpm lint` and fix any errors on the placeholder files.

---

## 8. Prettier Configuration

- [ ] Create `prettier.config.js` (ESM, `.js` extension) with project-wide
      formatting options, e.g.:
  - `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`
  - File patterns to format: `**/*.{ts,tsx,js,json,md,css}`
- [ ] Create `.prettierignore` excluding `dist/`, `node_modules/`,
      `pnpm-lock.yaml`.
- [ ] Run `pnpm format` across the scaffold and verify it exits 0.

---

## 9. Vitest Configuration

- [ ] Create `vitest.config.ts` that:
  - Imports and extends `vite.config.ts` via `mergeConfig` so aliases are
    shared.
  - Sets `test.environment: "jsdom"`.
  - Sets `test.coverage.provider: "v8"`.
  - Sets `test.include: ["tests/unit/**/*.test.{ts,tsx}",
"tests/integration/**/*.test.{ts,tsx}"]`.
- [ ] Create the smoke test at `tests/unit/smoke.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  describe('smoke', () => {
    it('should be true', () => {
      expect(true).toBe(true);
    });
  });
  ```
- [ ] Run `pnpm test:run` and confirm it exits 0 with 1 test passing.

---

## 10. Playwright Configuration

- [ ] Run `pnpm exec playwright install chromium --with-deps` (or add as a
      `postinstall` step; will also run in the Dockerfile).
- [ ] Create `playwright.config.ts` with:
  - `testDir: "tests/visual"`.
  - `use.baseURL: "http://localhost:5173"`.
  - A `webServer` block that starts `pnpm dev` before tests run.
- [ ] Verify `pnpm test:e2e` runs (even with zero visual tests) and exits 0.

---

## 11. npm Scripts

- [ ] Add all scripts from PRD §5.8 to `package.json`:

  | Script          | Command                                    |
  | --------------- | ------------------------------------------ |
  | `dev`           | `vite`                                     |
  | `build`         | `tsc -p tsconfig.build.json && vite build` |
  | `preview`       | `vite preview`                             |
  | `lint`          | `eslint .`                                 |
  | `lint:fix`      | `eslint . --fix`                           |
  | `format`        | `prettier --write .`                       |
  | `format:check`  | `prettier --check .`                       |
  | `typecheck`     | `tsc --noEmit`                             |
  | `test`          | `vitest`                                   |
  | `test:run`      | `vitest run`                               |
  | `test:coverage` | `vitest run --coverage`                    |
  | `test:e2e`      | `playwright test`                          |
  | `prepare`       | `husky`                                    |

---

## 12. Husky + lint-staged (Pre-commit Hook)

- [ ] Run `pnpm exec husky init` (creates `.husky/` and a sample `pre-commit`
      file).
- [ ] Replace `.husky/pre-commit` with:
  ```sh
  #!/bin/sh
  pnpm exec lint-staged
  pnpm exec tsc --noEmit
  ```
- [ ] Add `lint-staged` config to `package.json`:
  ```json
  "lint-staged": {
    "*.{ts,tsx,json,md,css}": "prettier --write",
    "*.{ts,tsx}": "eslint --fix"
  }
  ```
- [ ] Verify that the `prepare` script (`"prepare": "husky"`) is in
      `package.json` so hooks are installed on every `pnpm install`.
- [ ] Test the hook manually: introduce a deliberate lint error, attempt
      `git commit`, and confirm it is rejected.

---

## 13. `.gitignore`

- [ ] Create `.gitignore` covering at minimum:
  - `node_modules/`
  - `dist/`
  - `.env` and `.env.local`
  - Editor artefacts: `.vscode/settings.json` (keep `.vscode/extensions.json`),
    `.idea/`, `*.swp`, `.DS_Store`
  - Test output: `coverage/`, `playwright-report/`, `test-results/`
- [ ] After `pnpm build`, run `git status` and confirm `dist/` does not appear
      as untracked.

---

## 14. `.env.example`

- [ ] Create `.env.example` at the repo root with a comment block explaining the
      convention (`VITE_` prefix for browser-visible vars) and no actual
      variables yet (they will be added per feature).

---

## 15. `README.md`

- [ ] Create `README.md` with:
  1. One-line project description.
  2. Prerequisites: Node.js version (from `.nvmrc`), pnpm v9+.
  3. Quick-start: `git clone`, `pnpm install`, `pnpm dev`.
  4. Available scripts table (mirrors PRD §5.8).
  5. Links to `PROJECT_OVERVIEW.md` and `AGENTS.md`.

---

## 16. Devcontainer

### 16a. `Dockerfile`

- [ ] Create `.devcontainer/Dockerfile`:
  - Base: `mcr.microsoft.com/devcontainers/javascript-node:1-22` (LTS, matches
    `.nvmrc`).
  - Install pnpm globally at the version declared in
    `package.json#packageManager`:
    ```dockerfile
    RUN npm install -g pnpm@<version>
    ```
  - Install Playwright browser deps:
    ```dockerfile
    RUN npx playwright install --with-deps chromium
    ```
  - Ensure the container user is the pre-existing non-root `node` user (uid 1000) — no `USER root` at the end.
  - No `--privileged` flag; no host Docker socket mount.

### 16b. `devcontainer.json`

- [ ] Create `.devcontainer/devcontainer.json`:
  - `"build": { "dockerfile": "Dockerfile" }`
  - `"postCreateCommand": "pnpm install"`
  - `"forwardPorts": [5173, 4173]`
  - `"customizations.vscode.extensions"`:
    - `"dbaeumer.vscode-eslint"`
    - `"esbenp.prettier-vscode"`
    - `"ms-vscode.vscode-typescript-next"`
    - `"bradlc.vscode-tailwindcss"`
    - `"GitHub.copilot"` (optional)
  - `"customizations.vscode.settings"`:
    - `"editor.formatOnSave": true`
    - `"editor.defaultFormatter": "esbenp.prettier-vscode"`
  - `"remoteEnv": { "CLAUDE_CODE_SKIP_PERMISSIONS": "1" }` — enables yolo mode
    for AI agents automatically.
  - **Do not** set `"runArgs": ["--privileged"]`.
  - **Do not** mount the host Docker socket.

### 16c. Verify security posture

- [ ] Build the container locally via "Reopen in Container" in VS Code.
- [ ] Run `docker inspect <container-id>` and confirm:
  - `Privileged: false`
  - No `/var/run/docker.sock` bind mount.
  - Running user is `node` (non-root).

---

## 17. Final Verification Checklist

Map to success criteria from PRD §4:

| #   | Criterion                                               | Command / Action                                                           |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Dev server starts                                       | `pnpm install && pnpm dev` → browser shows placeholder at `localhost:5173` |
| 2   | Production build succeeds                               | `pnpm build` exits 0; `dist/` is created                                   |
| 3   | Lint passes                                             | `pnpm lint` exits 0                                                        |
| 4   | Type-check passes                                       | `pnpm typecheck` exits 0                                                   |
| 5   | Tests pass                                              | `pnpm test:run` exits 0 (smoke test)                                       |
| 6   | Pre-commit hook rejects bad commits                     | Commit a deliberate lint error; confirm rejection                          |
| 7   | `.env.example` exists with comment block                | `cat .env.example`                                                         |
| 8   | `README.md` has setup instructions                      | Code review                                                                |
| 9   | `.gitignore` excludes build artefacts                   | `pnpm build && git status` shows `dist/` ignored                           |
| 10  | Directory structure matches PRD §5.3                    | Compare with tree output                                                   |
| 11  | Devcontainer builds & `pnpm dev` works inside it        | VS Code "Reopen in Container"                                              |
| 12  | Claude Code runs in yolo mode inside container          | `claude --dangerously-skip-permissions` inside container                   |
| 13  | Container is non-root, non-privileged, no Docker socket | `docker inspect`                                                           |

---

## Order-of-Operations Summary

```
1  package.json bootstrap
2  .nvmrc
3  pnpm install (all deps) → pnpm-lock.yaml
4  tsconfig.json + tsconfig.build.json
5  vite.config.ts + index.html
6  src/ + tests/ directory structure & placeholders
7  eslint.config.js
8  prettier.config.js + .prettierignore
9  vitest.config.ts + smoke test
10 playwright.config.ts
11 package.json scripts
12 .husky/pre-commit + lint-staged config
13 .gitignore
14 .env.example
15 README.md
16 .devcontainer/ (Dockerfile + devcontainer.json)
17 Final verification
```

Each step should end with a passing `pnpm lint` + `pnpm typecheck` before
moving to the next.
