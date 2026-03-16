---
id: 3dv-z50x
status: closed
deps: [3dv-qo4x]
links: []
created: 2026-03-16T12:57:23Z
type: task
priority: 2
assignee: Thorben Louw
parent: 3dv-gxrh
---

# Feature 21: headed visual verification

Coordinate headed Playwright verification with the user and confirm sticky table opacity, neighbour opacity, distant table fading, and smooth transitions using the evidence files described in AGENTS.md.

## Acceptance Criteria

Headed E2E evidence confirms sticky table and direct neighbours remain opaque, 2-hop tables fade, 3+ hop tables are nearly invisible, and sticky transitions are smooth.

## Notes

**2026-03-16T13:14:33Z**

Reviewed headed Playwright evidence on 2026-03-16. Run did not complete cleanly: tests/visual/viewFilterGroups.spec.ts AT-9 failed while toggling the orders checkbox during reload filter reset verification. No hop-transparency-specific screenshot or assertion was produced in test-evidence/, so Feature 21 visual acceptance remains unverified.

**2026-03-16T13:32:51Z**

Headed Playwright rerun completed cleanly on 2026-03-16 with 19/19 passing in test-evidence/e2e-run.txt. Follow-up renderer fix made full-card hop fading visible by fading row fills, labels, badges, and edge lines together. Human manual verification confirmed the near-invisibility effect now looks much better.
