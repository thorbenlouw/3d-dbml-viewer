# TODO — Feature 19: Enum Rendering in Table Cards

## Tasks

- [ ] **Parser — types**: Add `ParsedEnumValue`, `ParsedEnum` to `src/types/`; extend `ParsedSchema` with `enums?: ParsedEnum[]` and `ParsedColumn` with `enumValues?: ParsedEnumValue[]`
- [ ] **Parser — implementation**: In `src/parser/`, read `schema.enums[]` from `@dbml/core` AST; for each field whose `type.type_name` matches an enum name, populate `enumValues` on the `ParsedColumn`
- [ ] **Parser — tests**: Unit tests in `tests/unit/parser/` covering: no enums → no enumValues; enum match → values populated; unmatched type → no enumValues; enum value with note
- [ ] **Renderer — enum badge**: Add a distinct `E` badge to the field row in `TableCard` when `column.enumValues` is defined, styled consistently with existing PK/FK/NN/UQ badges
- [ ] **Renderer — hover/navigation panel**: When a field with `enumValues` is hovered, display the enum value list (including optional notes) in the `NavigationPanel`
- [ ] **Renderer — mode gating**: Ensure enum badge and values are shown in `full` and `ref-fields-only` modes; no display needed in `table-only` mode
- [ ] **Integration test**: Add a fixture DBML with enums to `tests/fixtures/`; write an integration test covering the full parse → render pipeline
- [ ] **Quality gates**: `pnpm lint`, `pnpm typecheck`, `pnpm test:run` all pass

---

When all tasks are complete the agent should output <promise>DONE</promise>.
