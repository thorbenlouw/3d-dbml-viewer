---
id: 3dv-gxrh
status: closed
deps: [3dv-jhjl]
links: []
created: 2026-03-16T12:52:07Z
type: feature
priority: 2
assignee: Thorben Louw
external-ref: feature-21-hop-based-transparency
tags: [feature, migration]
---

# Feature 21: Hop-Based Transparency for Sticky Tables

Back-populated from `features/21-hop-based-transparency/`. This ticket tracks hop-aware opacity when sticky focus is active.

## Acceptance Criteria

- A BFS-based hop-distance utility computes graph distances from the sticky table.
- Scene simulation exposes hop distances to table cards and relationship links when sticky mode is active.
- Table and link opacity combine hop-based fading with camera-distance opacity using smooth lerped transitions.
- Unit tests cover hop-distance computation and the implementation is reflected in the current renderer code and visual evidence.

## Notes

**2026-03-16T12:57:52Z**

Added child task tickets to match every item in features/21-hop-based-transparency/TODO.md and reopened the feature to reflect the uncovered work.

**2026-03-16T13:32:57Z**

All Feature 21 child tickets are closed. Verified BFS utility/tests, simulation and scene hop-distance plumbing, shared hop-opacity logic for cards and links, quality gates, headed Playwright rerun (19/19 passing), and human manual verification that 3+ hop fading is now visibly near-invisible after full-card fade fix.
