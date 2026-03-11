# TODO — Feature 18: CI Workflow

## Tasks

- [ ] **bd-1** Create `.github/workflows/` directory structure
- [ ] **bd-2** Write `.github/workflows/ci.yml` with the `quality-gates` job
  - Trigger on push to `main` and pull_request targeting `main`
  - Steps: checkout → setup-node (v22, cache pnpm) → pnpm/action-setup (v9.15.9) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test:run`
  - Do NOT include `pnpm test:e2e`
- [ ] **bd-3** Verify workflow syntax is valid (lint or dry-run the YAML)
- [ ] **bd-4** Commit and push; confirm GitHub Actions triggers and all steps pass green

---

When all tasks are complete the agent should output <promise>DONE</promise>.
