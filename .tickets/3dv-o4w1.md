---
id: 3dv-o4w1
status: closed
deps: [3dv-9aac]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-18-ci-workflow
tags: [feature, migration]
---

# Feature 18: CI Workflow

Back-populated from `features/18-ci-workflow/`. This ticket tracks the GitHub Actions quality-gates workflow.

## Acceptance Criteria

- `.github/workflows/ci.yml` exists and triggers on pushes and pull requests to `main`.
- The workflow installs pnpm dependencies and runs `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.
- The workflow deliberately excludes `pnpm test:e2e` per repository guidance.
- Node and pnpm versions align with project configuration.
