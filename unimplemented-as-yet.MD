# Unimplemented As Yet

This document is an audit of what is still missing relative to:

- the feature PRDs under `features/*/PRD.md`
- the backlog in `ideas.MD`
- DBML capabilities that do not currently have first-class support in the app

It is based on the current codebase as of `2026-03-11`.

## 1. PRD items not implemented yet

### Feature 03: Field and Table Notes

The parser extracts table and field notes, and note badges are rendered on cards, but the main interaction described by the PRD is not implemented.

Missing:

- clicking a note badge to open a note panel
- a single active note state in `Scene`
- the floating 3D note panel workflow described in the PRD
- the connector line from note badge to note panel
- note-specific close/dismiss interaction
- note-open highlighting that is driven by selected note state rather than simple hover

Current behavior:

- note badges are passive
- note text appears in the right-hand hover/details panel
- `NotePanel.tsx` and `NoteConnector.tsx` exist, but they are not wired into `Scene`

### Feature 11: Referenced By in Details Panel

Most of this feature is implemented, but one important requirement from the PRD is not.

Missing or divergent:

- full DBML schema-qualified labels are not implemented as specified

Current behavior:

- labels are built from `tableGroup.name` when a table group exists, not from DBML schema namespace
- this means the intended `schema.table.field` requirement is not satisfied

## 2. PRD items that may still be incomplete at the project/setup level

### Feature 00: Initial Project Setup

Most of the scaffold work is present, but one thing is still unclear or absent from the repository structure:

- no CI workflow directory was found under `.github/`

That does not block local development, but it means the PRD ambition around shared automated CI is not visibly implemented in this repository.

## 3. ideas.MD items still not working

Items in `ideas.MD` that do not appear to be implemented yet:

- render field `default` values in the table card
- render `checks` on the table card, with hover detail
- render `indexes` on the table card, with hover detail
- render connection type directly on the relationship line
- render named refs on the connection line
- render enum values/types in table cards with an enum indicator
- show relationship settings in the sidebar when a connection is selected
- support Markdown rendering for field/table notes
- support `TableGroup` notes
- support sticky notes as floating notes in the scene
- support `records` / sample data popups

Notes on `ideas.MD` accuracy:

- item 11 is marked `[X]` — project name and project note are rendered via `ProjectNotesCard`
- item 16 is marked `[X]` in `ideas.MD`, but the current implementation is hover-from-field driven relationship highlighting; no separate connection-hover workflow that highlights referenced table fields was found

## 4. DBML features with no first-class support yet

This section focuses on DBML features that are either not parsed into the app model, or are parsed but not surfaced meaningfully in the UI.

### Fully unsupported or not surfaced

- field `default` values
- `indexes { ... }` blocks as first-class rendered entities
- `checks` / check constraints as first-class rendered entities
- `Enum` declarations and enum value rendering
- `Ref` names rendered in the scene
- relationship actions/settings beyond the currently used subset
  - examples: cascade/update/delete settings in the UI
- `TableGroup` notes
- `records` / sample data display

### Partially supported only

- table/field notes
  - parsed and shown in hover panel
  - not rendered as interactive note panels
  - no Markdown support for table/field notes

- `TablePartial`
  - supported indirectly for header-color precedence
  - not surfaced as a first-class concept in the viewer

- DBML schema namespaces / multi-schema identity
  - not handled as a first-class identity model
  - table IDs are currently derived from `table.name`
  - this risks collisions if multiple DBML schemas contain tables with the same name
  - reference labels also use `tableGroup` as a qualifier, not DBML schema name

- relationship metadata
  - cardinality is computed for the details panel
  - connection lines themselves do not render names or type labels

## 5. Practical summary

The biggest functional gaps are:

- interactive field/table note panels
- first-class support for richer DBML metadata such as defaults, indexes, checks, enums, and named refs

The biggest structural gap in DBML support is:

- lack of proper first-class multi-schema identity and schema-qualified labeling
