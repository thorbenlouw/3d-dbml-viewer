---
id: 3dv-v0kf
status: closed
deps: []
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-00-initial-project-setup
tags: [feature, migration]
---

# Feature 00: Initial Project Setup

Back-populated from `features/00-initial-project-setup/`. This ticket tracks the project scaffold, quality gates, documentation, and local/devcontainer setup that the repo now contains.

## Acceptance Criteria

- Vite/TypeScript/pnpm project scaffold exists with strict type checking, linting, formatting, unit/integration/e2e tooling, and working npm scripts.
- Foundational repo files exist and are aligned: `.nvmrc`, `.env.example`, `.gitignore`, `README.md`, `.devcontainer/`, `.husky/`, `tsconfig*`, `vite.config.ts`, and `vitest.config.ts`.
- Pre-commit automation is configured for formatting and linting.
- Local quality gates succeed: `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.
