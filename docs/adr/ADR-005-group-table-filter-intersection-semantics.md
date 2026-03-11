# ADR-005: Group and Table Filter Visibility Uses Intersection Semantics

**Status:** Accepted
**Date:** 2026-03-11
**Feature:** Feature 17 — View Filters: TableGroups and Reload

---

## Context

The View Filters system has two independent visibility axes:

- **Group-level:** `visibleTableGroupIds` — a set of group IDs (including the
  synthetic `'__ungrouped__'` sentinel) whose tables are allowed to appear.
- **Table-level:** `visibleTableIds` — a set of individual table IDs that are
  explicitly visible.

When a user hides a group and then re-shows it, there is a question about what
happens to individual tables the user had manually hidden within that group
before hiding it:

- **Intersection (AND):** a table is visible only if both its group is visible
  AND its individual table entry is visible. Re-enabling a group does not restore
  manually hidden tables within it.
- **Union (OR) / group-overrides-table:** showing a group forces all its tables
  to appear, ignoring per-table overrides.
- **Last-write-wins:** whichever control was used most recently takes precedence.

---

## Decision

Visibility is determined by the **intersection** of group and table filters:

```
visible = groupIsVisible(table) AND tableIsVisible(table)
```

A table appears in the scene only when both conditions are true. Re-enabling a
group never overrides a per-table hidden state.

---

## Reasons

**1. Re-enabling a group should not undo deliberate per-table choices**

If a user has carefully unchecked three specific tables in a group, and then
hides the entire group to temporarily focus elsewhere, re-showing the group
should restore the state they left — with those three tables still hidden. Union
semantics would silently undo their work, which would be surprising and
frustrating.

**2. Intersection semantics are predictable and composable**

A user can reason about the result of any combination of group and table toggles
without needing to track toggle order. "My table is visible if and only if its
group is on AND I haven't hidden it individually" is a simple mental model.
Last-write-wins semantics require users to remember which control they touched
most recently, which does not scale.

**3. Group toggle is a bulk convenience, not an override**

Hiding a group is a shortcut for "I don't want to see any of these tables right
now." It does not mean "reset all per-table state for this group." Treating it
as a bulk shortcut that composes with per-table state is consistent with how
similar multi-level filter UIs behave (e.g. tree-select controls in data grids).

**4. Implementation is straightforward**

`applyFilters` checks two conditions per table. There is no need to track toggle
order or merge two state trees. The filter state shape is a flat pair of sets;
the evaluation is a simple AND.

---

## Consequences

- `applyFilters` checks `visibleTableGroupIds.has(groupId)` AND
  `visibleTableIds.has(tableId)` for each table. Both must be true.
- The `'__ungrouped__'` sentinel is used as the group ID for tables with no
  `tableGroup`, so ungrouped tables participate in the same intersection logic.
- `defaultFilterState` must populate both `visibleTableGroupIds` (all groups +
  `'__ungrouped__'` if applicable) and `visibleTableIds` (all table IDs) so
  that the default state shows everything.
- `isFilterActive` must check both sets against their defaults to correctly
  report whether non-default filters are in effect.
- If a user hides a table individually, then hides its group, then re-shows the
  group: the table remains hidden. This is intentional and matches the documented
  behaviour in the Feature 17 PRD (AT-6).

---

## Alternatives Considered

**Union / group-overrides-table semantics**
Re-enabling a group forces all its tables visible regardless of per-table state.
Simple to explain ("groups win") but silently discards user configuration.
Rejected because it violates the principle of least surprise for users who have
invested effort in per-table configuration.

**Last-write-wins**
The most recently toggled control takes precedence. Requires tracking operation
order in state, complicates `applyFilters` (must replay history or store
resolved state), and is impossible to reason about from a static snapshot of
filter state. Rejected as unnecessarily complex.

**Group toggle clears per-table state for that group**
Hiding a group removes its tables from `visibleTableIds`; re-showing adds them
back. Avoids divergence but means per-table state is destroyed by group
operations. Rejected because it makes the two controls non-independent, and
users would lose fine-grained configuration whenever they use the group control.
