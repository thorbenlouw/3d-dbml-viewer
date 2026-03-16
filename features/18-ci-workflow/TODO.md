# TODO — Feature 18: CI Workflow

## Tasks

- [ ] **T1** Create `.github/workflows/` directory structure
- [ ] **T2** Write `.github/workflows/ci.yml` with the `quality-gates` job
  - Trigger on push to `main` and pull_request targeting `main`
  - Steps: checkout → setup-node (v22, cache pnpm) → pnpm/action-setup (v9.15.9) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test:run`
  - Do NOT include `pnpm test:e2e`
- [ ] **T3** Verify workflow syntax is valid (lint or dry-run the YAML)
- [ ] **T4** Commit and push; confirm GitHub Actions triggers and all steps pass green

---

When all tasks are complete the agent should output <promise>DONE</promise>.
