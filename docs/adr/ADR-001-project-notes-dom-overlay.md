# ADR-001: Project Notes Panel as a DOM Overlay, Not a 3D Scene Object

**Status:** Accepted
**Date:** 2026-03-11
**Feature:** Feature 14 — Project Notes Panel

---

## Context

The original Feature 14 PRD specified the project notes panel as a "TableCard-like panel in the scene" — a 3D object rendered inside the React Three Fiber `<Canvas>` alongside table cards. During implementation, a DOM overlay approach was chosen instead, using a fixed-position React component (`ProjectNotesCard`) rendered outside the canvas.

The PRD's in-scene approach was initially motivated by visual coherence — the panel would sit in the same spatial world as the diagram. However, that assumption deserved scrutiny before treating the implementation as a deviation.

---

## Decision

The project notes panel will be implemented as a **DOM overlay** (a fixed-position, out-of-canvas React component), not as a 3D scene object.

This is the deliberate and final architectural choice for this feature. The original PRD language describing an in-scene panel is superseded by this decision.

---

## Reasons

**1. Content-first rendering**

The project notes panel primarily renders Markdown, including headings, lists, code blocks, links, and images. The DOM handles all of this natively. A 3D billboard using `<Html>` from `@react-three/drei` would ultimately render DOM inside the canvas anyway — creating the same DOM subtree with added transform complexity and interaction overhead for no gain.

**2. No spatial relationship to the schema**

Table cards and relationship lines are spatially meaningful — their positions encode schema structure. The project notes panel is schema-wide context, not a node in the graph. Placing it at an arbitrary 3D coordinate adds nothing to the user's understanding; it just makes it harder to read and interact with.

**3. Scroll, selection, and accessibility**

Long notes benefit from native scroll, text selection, link focus, and screen reader behavior. All of these work reliably in the DOM. Replicating them in a Three.js context requires significant additional work and remains less robust.

**4. Camera independence**

A fixed DOM overlay stays readable regardless of camera position and zoom. An in-scene panel would require careful placement to avoid being occluded, scaled out of legibility, or clipped by near/far planes during orbit.

**5. Minimize/expand behavior**

The toggle between minimized and expanded states is a simple React state update affecting a DOM element. In a 3D context this would require geometry resizing and re-layout that adds fragility without user-visible benefit.

---

## Consequences

- `ProjectNotesCard` is the component responsible for this feature. It renders as a DOM overlay positioned at a fixed corner of the viewport, outside the `<Canvas>` element.
- The Feature 14 PRD is updated to reflect the overlay approach as the accepted implementation.
- No `ProjectNoteNode` is added to the graph model; the project note is passed directly to the overlay component from `App` state.
- Future changes to note rendering stay in the React/DOM layer, not the R3F scene layer.
- If a future requirement genuinely needs the notes panel to exist in 3D space (for example, to position it near a specific table), this decision should be revisited at that time.

---

## Alternatives Considered

**In-scene 3D billboard using `<Html>` (drei)**
Would create a DOM node inside the canvas via a Three.js transform. Inherits most DOM benefits but adds positional complexity, camera-distance scaling issues, and pointer-event conflicts with orbit controls. Rejected.

**WebGL-rendered text panel (no DOM)**
Full 3D text rendering using troika or a custom geometry. Loses native Markdown rendering, scroll, image handling, and accessibility entirely. Significantly more implementation effort. Rejected.
