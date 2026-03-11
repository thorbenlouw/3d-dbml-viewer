# PRD — CI Workflow (Feature 18)

## Problem

There is no automated continuous integration pipeline. Quality gates (lint,
typecheck, unit and integration tests) only run when a developer chooses to run
them locally. This means regressions can be committed and pushed without any
automated check, and contributors have no shared signal for whether the
codebase is healthy.

The project is otherwise ready to be treated as a shippable baseline — the
absence of CI is the most consequential remaining gap.

## Goal

Add a GitHub Actions workflow that runs the full quality gate suite on every
push and pull request to `main`, giving contributors immediate feedback on
regressions and giving the project a visible health signal.

## Non-Goals

- Deployment or release automation (separate concern for a future feature).
- Code coverage enforcement via CI failure thresholds (coverage is a local
  developer tool for now; thresholds can be added later).
- Playwright E2E tests in CI — headless Chromium cannot create a WebGL context,
  so E2E tests cannot meaningfully run without a display server or a browser
  that degrades gracefully. E2E remains a manual step delegated to the developer
  as documented in `AGENTS.md`.
- Caching beyond what the pnpm store provides (add if build times become a
  problem).

---

## Success Criteria

| # | Criterion |
|---|-----------|
| 1 | A GitHub Actions workflow file exists at `.github/workflows/ci.yml`. |
| 2 | The workflow triggers on every push to `main` and on every pull request targeting `main`. |
| 3 | The workflow runs `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` in sequence. |
| 4 | Any failure in lint, typecheck, or tests causes the workflow to fail and blocks the PR. |
| 5 | The workflow uses the same Node.js version as the project (read from `.nvmrc` or `engines` field). |
| 6 | The workflow installs dependencies with `pnpm` and caches the pnpm store to keep runs fast. |
| 7 | The workflow name and job names are descriptive enough to read at a glance in the GitHub UI. |

---

## Functional Requirements

### Trigger

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Jobs

A single job named `quality-gates` (or similar) with these steps in order:

1. Checkout code (`actions/checkout`)
2. Install Node.js at the correct version (`actions/setup-node` with `cache: 'pnpm'`)
3. Install pnpm (`pnpm/action-setup`)
4. Install dependencies (`pnpm install --frozen-lockfile`)
5. Run `pnpm lint`
6. Run `pnpm typecheck`
7. Run `pnpm test:run`

### E2E tests

Do **not** include `pnpm test:e2e` in the CI workflow. Headless Chromium cannot
create a WebGL context; the tests that assert on scene presence will fail or
give false positives. E2E is validated manually by the developer before merging,
per the process documented in `AGENTS.md`.

If a future iteration adds a display server (e.g. `Xvfb` + headed Chromium or
a cloud browser service), the E2E step can be added at that point.

---

## Node.js and pnpm Version

- Use the Node.js version specified in `.nvmrc` if present, otherwise match the
  `engines.node` field in `package.json`.
- Use the pnpm version specified in `packageManager` in `package.json`.

---

## Acceptance Tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Push a commit with a lint error to a branch and open a PR | CI fails on the lint step; PR is blocked |
| 2 | Push a commit that breaks a TypeScript type | CI fails on the typecheck step |
| 3 | Push a commit that breaks a unit test | CI fails on the test:run step |
| 4 | Push a clean commit | CI passes; green check on the commit and PR |
| 5 | Open a PR targeting `main` | CI runs automatically without manual trigger |
| 6 | Inspect a successful CI run | All three steps visible and named clearly |
