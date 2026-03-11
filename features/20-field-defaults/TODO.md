# TODO — Feature 20: Field Default Values in Table Cards

## Tasks

- [ ] **Parser — types**: Add `ParsedColumnDefault` interface (`type`, `value: string`) to `src/types/`; extend `ParsedColumn` with `default?: ParsedColumnDefault`
- [ ] **Parser — implementation**: In `src/parser/`, read `field.dbdefault` from the `@dbml/core` AST; normalise number/boolean values to string via `String(value)`; map all four types (`number`, `string`, `boolean`, `expression`)
- [ ] **Parser — tests**: Unit tests in `tests/unit/parser/` covering: no default → undefined; number default; string default; boolean default; expression default; field with both default and other attributes
- [ ] **Renderer — field row display**: In `TableCard`, render the default value on the field row in a visually secondary style (`= 0`, `= true`, `= 'hello'`); render expression defaults in monospace/code style; truncate long values gracefully
- [ ] **Renderer — navigation panel**: When a field with a default is hovered, show the full untruncated default value with type label in `NavigationPanel` (e.g. "Default: `now()` (expression)")
- [ ] **Renderer — mode gating**: Defaults visible in `full` and `ref-fields-only` modes; not visible in `table-only` mode
- [ ] **Integration test**: Add a fixture DBML file with all four default types to `tests/fixtures/`; write an integration test covering parse → display
- [ ] **Quality gates**: `pnpm lint`, `pnpm typecheck`, `pnpm test:run` all pass

---

When all tasks are complete the agent should output <promise>DONE</promise>.
