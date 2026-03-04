# 3D DBML Viewer

A browser-based 3D entity-relationship diagram viewer for DBML schemas, powered by React Three Fiber and d3-force-3d.

## Prerequisites

- Node.js v22+ (see `.nvmrc`)
- pnpm v9+

## Quick Start

```sh
git clone <repo-url>
cd 3d-dbml-viewer
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Script               | Description                         |
| -------------------- | ----------------------------------- |
| `pnpm dev`           | Start the development server        |
| `pnpm build`         | Type-check and build for production |
| `pnpm preview`       | Preview the production build        |
| `pnpm lint`          | Run ESLint                          |
| `pnpm lint:fix`      | Run ESLint with auto-fix            |
| `pnpm format`        | Format code with Prettier           |
| `pnpm format:check`  | Check formatting without writing    |
| `pnpm typecheck`     | Run TypeScript type-checking        |
| `pnpm test`          | Run tests in watch mode             |
| `pnpm test:run`      | Run tests once                      |
| `pnpm test:coverage` | Run tests with coverage report      |
| `pnpm test:e2e`      | Run Playwright end-to-end tests     |

## Documentation

- [Project Overview](./PROJECT_OVERVIEW.md) — architecture, data flow, design decisions
- [Agents Guide](./AGENTS.md) — coding conventions, testing strategy, git workflow
