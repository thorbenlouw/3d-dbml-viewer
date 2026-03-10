# 3D DBML Viewer — Project Overview

## Purpose

A browser-based tool that parses [DBML (Database Markup Language)](https://dbml.dbdiagram.io) schema files and renders the entity-relationship diagram as an interactive 3D scene. Users can explore large, complex schemas spatially — rotating, zooming, and navigating between tables — in a way that flat 2D diagrams cannot support.

## Goals

- **Readable at scale** — schemas with 50+ tables become navigable, not overwhelming.
- **Embeddable** — ships as a reusable React component that can be dropped into existing documentation sites or internal tooling.
- **Developer-friendly** — accepts raw DBML text or a file path; designed for integration into CI pipelines and docs-as-code workflows.

## Non-Goals (v1)

- SQL/ORM import (only DBML input).
- Real-time collaboration.
- Editing the schema from within the viewer.
- Server-side rendering.

---

## Architecture

### Data Flow

```
DBML text
    │
    ▼
┌─────────────┐
│  Parser      │  @dbml/core
│  (TypeScript)│  Converts DBML → normalised JSON graph
└─────────────┘
    │  { tables, fields, refs }
    ▼
┌────────────────┐
│ View Filters   │  App-level derivation step
│                │  Computes `FilterState` defaults, applies
│                │  `applyFilters`, and selects field-detail mode
└────────────────┘
    │  filtered { tables, refs } + display mode
    ▼
┌─────────────┐
│ Layout Engine│  d3-force-3d
│             │  Force-directed simulation in 3D space
│             │  Outputs (x, y, z) per node
└─────────────┘
    │  { id, x, y, z }[]
    ▼
┌─────────────┐
│  Renderer   │  React Three Fiber + Three.js
│             │  Renders billboarding table cards (header + field rows + badges)
│             │  and routed relationship links as 3D objects
└─────────────┘
    │
    ▼
  Browser canvas
```

### Layers

| Layer             | Technology                                         | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parser**        | `@dbml/core`                                       | Tokenise and validate DBML; produce a typed JS object graph (`Database`, `Table`, `Field`, `Ref`). Extracts optional `note` strings on both `ParsedTable` and `ParsedColumn`. Also extracts DBML color style attributes: `Table [headercolor]`, `Ref [color]`, and `TableGroup [color]`; applies precedence rules (table-local > last injected partial > undefined). Produces `ParsedSchema.tableGroups` with group color metadata. Extracts `ParsedSchema.projectNote?: string` from the DBML `Project { Note: '...' }` block; trimmed, treated as `undefined` when empty.                                                                   |
| **Graph model**   | Plain TypeScript                                   | Transform the parser output into a framework-agnostic node/edge graph suitable for layout. `ParsedColumn.note` and `ParsedTable.note` carry annotation text. `ParsedTable.headerColor`, `ParsedRef.color`, and `ParsedTableGroup.color` carry resolved DBML color tokens.                                                                                                                                                                                                                                                                                                                                                                      |
| **View filters**  | React state + parser helpers                       | `App` owns `FilterState` (`fieldDetailMode` + `visibleTableIds`) and resets it whenever a new schema is loaded. `defaultFilterState(schema)` chooses `full` for schemas with up to 30 tables and `table-only` above that threshold. `applyFilters(schema, filterState)` removes hidden tables and any refs whose endpoints are not both visible before the schema reaches simulation/rendering. `isFilterActive` drives the toolbar indicator for non-default filter combinations.                                                                                                                                             |
| **Layout engine** | `d3-force-3d`                                      | Two-phase hierarchical layout. Phase 1 (`src/layout/groupLayout.ts`): builds `TableGroupDescriptor` objects from the parsed schema, places named groups in non-overlapping world-space regions (`placeGroups`), and seeds each table near its group center (`computeGroupSeedPositions`). Phase 2: runs a 3D force-directed simulation with a weak group-cohesion force that keeps grouped tables clustered together during the interactive live simulation (`useForceSimulation`). Group boundary bounding boxes carry the resolved group color from `ParsedSchema.tableGroups`.                                                              |
| **Renderer**      | React Three Fiber (`@react-three/fiber`), Three.js | Declarative React component tree that maps graph nodes to `<mesh>` table cards and graph edges to curved routed link lines with endpoint fan-out. `TableGroupBoundary` renders a translucent box + wireframe edges + floating label around each DBML `TableGroup`, tinted by the group's resolved color. `TableCard` applies DBML `headercolor` to the card header mesh. `RelationshipLink3D` applies DBML `Ref [color]` to the tube material. Color resolution and fallback logic lives in `src/renderer/colorUtils.ts`. Includes `NotePanel` (billboarding popup for field/table notes) and `NoteConnector` (arc line from anchor to panel). `ProjectNotesCard` is a DOM overlay panel (not a 3D object) that renders the DBML `Project.Note` as sanitized Markdown (via `react-markdown` + `rehype-sanitize`); it supports minimize/expand and appears only when the schema has a non-empty project note. The renderer also respects `FieldDetailMode`: `full`, `ref-fields-only`, or `table-only`, which determines whether cards show all columns, only relationship columns, or only the table header. |
| **Controls**      | `@react-three/drei`                                | Orbit controls, camera damping, label sprites, and click-to-focus interaction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **UI shell**      | React + Tailwind CSS                               | File upload, DBML text editor panel, HUD controls outside the canvas, and the `View Filters` modal workflow. The toolbar exposes a `View Filters` button with an active-state indicator. `ViewFiltersDialog` lets users switch between the three field-detail modes, select/unselect all tables, and toggle individual table visibility with immediate effect on the scene.                                                                                                                                                                                                                                                                   |

### Directory Layout (target)

```
3d-dbml-viewer/
├── src/
│   ├── parser/          # DBML → graph model
│   ├── layout/          # d3-force-3d integration
│   ├── renderer/        # React Three Fiber scene components
│   ├── ui/              # Shell UI (sidebar, toolbar)
│   ├── hooks/           # Shared React hooks
│   └── types/           # Shared TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── visual/          # Storybook / Playwright visual tests
├── features/            # Per-feature PRDs and design notes
├── public/
├── .env.example
├── AGENTS.md
└── PROJECT_OVERVIEW.md
```

---

## Key Technical Decisions

### Why `@dbml/core`?

It is the reference implementation parser maintained by the creators of DBML (holistics.io). It handles edge cases, comments, and multi-schema DBML correctly. Alternative: hand-rolled parser (rejected — high maintenance burden).

### Why `d3-force-3d`?

Extends the well-understood d3-force API into 3D with minimal API surface. Produces deterministic layouts given a fixed seed. Alternative: `three-forcegraph` (higher-level but less control over the simulation).

### Why React Three Fiber instead of raw Three.js?

The component model aligns naturally with our React UI shell, making it straightforward to colocate scene state with React state. Drei provides ready-made helpers (Html overlays, Line, Text) that accelerate development. Alternative: vanilla Three.js (rejected — leads to imperative glue code fighting the React lifecycle).

### Why Tailwind CSS?

Utility-first CSS eliminates class-naming overhead for a small UI shell. Works well with component-library patterns.

### Why derive a filtered schema before layout/rendering?

Hidden tables should not merely disappear visually. They must also be removed from the force-simulation input so invisible nodes do not keep influencing the positions of visible tables. Treating filtering as a pure derivation step keeps the parser output immutable and makes the behavior straightforward to test in unit and integration coverage.

---

## Open Questions

1. **Layout persistence** — should the user be able to pin/save node positions? If so, where is that state stored (URL hash? localStorage?)?
2. **Performance ceiling** — at what schema size does the force simulation become too slow for the browser main thread? Will we need a Web Worker?
3. **Edge rendering** — straight `<Line>` segments vs. curved splines. Splines look better but add geometry complexity.
4. **Colour scheme** — resolved: DBML native color attributes (`Table [headercolor]`, `Ref [color]`, `TableGroup [color]`) are now respected. Tables, refs, and group boundaries each render with their DBML-defined color, falling back to the default dark-blue palette when none is specified.
