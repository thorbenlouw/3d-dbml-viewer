# Visual Guidelines — 3D DBML Viewer

## Design Philosophy

Clean, professional, and minimalist. The aesthetic is rational and highly legible — a modern, technology-focused consultancy image conveyed through restraint, precision, and confident use of white space. Every visual element earns its place; decoration is never the goal.

---

## Colour Palette

| Role                              | Name           | Hex       | RGB           |
| --------------------------------- | -------------- | --------- | ------------- |
| **Primary**                       | Curious Blue   | `#1C95D3` | 28, 149, 211  |
| **Secondary**                     | Deep Sea Green | `#0B4A69` | 11, 74, 105   |
| **Surface / Background**          | White          | `#FFFFFF` | 255, 255, 255 |
| **Dividers / Subtle backgrounds** | Light Gray     | `#F2F4F6` | 242, 244, 246 |
| **Body text**                     | Deep Sea Green | `#0B4A69` | 11, 74, 105   |

### Usage Rules

- **Curious Blue** (`#1C95D3`) is the dominant brand colour. Use it for interactive elements (buttons, links, active states), data-viz accents, and key UI highlights.
- **Deep Sea Green** (`#0B4A69`) anchors large blocks of copy, headings on light backgrounds, and high-contrast UI chrome (toolbars, sidebars).
- **White** (`#FFFFFF`) is the primary canvas. The open, white background is the main driver of the clean aesthetic; protect it aggressively.
- **Light Gray** (`#F2F4F6`) is used only for dividers, secondary backgrounds (e.g., input fields, code blocks), and subtle surface differentiation. Do not layer grays.
- Never use pure black (`#000000`) for text. Deep Sea Green provides sufficient contrast while remaining on-brand.

### 3D Scene Colours

Because the 3D canvas lives inside the white application shell, the scene palette must harmonise with the UI palette:

| Element                         | Base colour                              | Notes                                                             |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Table box (fill)                | Curious Blue `#1C95D3` at low opacity    | Opacity scales with proximity — see §Depth-based Opacity          |
| Table box (stroke / edge lines) | Curious Blue `#1C95D3` at full opacity   | Always fully opaque so the box silhouette is readable at distance |
| Table label text                | White `#FFFFFF`                          | High contrast against the blue fill                               |
| Scene background                | White `#FFFFFF` or very light gray       | Matches the application shell                                     |
| Relationship edges              | Deep Sea Green `#0B4A69` at mid opacity  | Low-prominence lines; not the hero                                |
| Camera reset button             | Curious Blue `#1C95D3` fill, White label | Standard button treatment                                         |

---

## Typography

### Typeface

**Lexend** is the sole typeface. It is highly legible at small sizes, unadorned, and professional — aligned with the clean, rational aesthetic. Load from Google Fonts or bundle as a web font.

```
font-family: 'Lexend', sans-serif;
```

Fallback stack: `'Lexend', 'Helvetica Neue', Arial, sans-serif`

### Type Scale

| Role             | Weight | Size (rem) | Line height |
| ---------------- | ------ | ---------- | ----------- |
| Page heading     | 600    | 1.75       | 1.2         |
| Section heading  | 500    | 1.25       | 1.3         |
| Body / UI labels | 400    | 0.875      | 1.5         |
| Caption / helper | 300    | 0.75       | 1.4         |
| 3D scene label   | 500    | see note   | —           |

> **3D scene labels** use Lexend at whatever point size remains legible after camera projection. The target rendered height is ≈18 px at a comfortable viewing distance. Labels must never be rasterised at a size that makes them blurry — use vector text (Drei `<Text>`) or a sufficiently high-resolution sprite.

### Rules

- Never mix weights on a single label. Use weight to establish hierarchy, not decoration.
- Do not use italic. The design language is upright and rational.
- Never use all-caps for body text. All-caps is acceptable only for overline / category tags, and even then use sparingly.
- Respect the measure (line length). UI panels should not exceed ~65 characters per line.

---

## Spacing & Layout

- **Grid**: 4 px base unit. All padding, margin, and gap values are multiples of 4 px.
- **White space is functional**: generous padding signals confidence and aids readability. Do not pack elements.
- UI panels (sidebar, toolbar) use an 8 px internal padding minimum; 16 px is standard.
- Separate distinct UI zones with Light Gray dividers (`1px solid #F2F4F6`), not heavy borders.

---

## Elevation & Depth

The UI shell is flat by design (no box-shadows except where necessary for floating panels).

| Layer                 | Treatment                                            |
| --------------------- | ---------------------------------------------------- |
| Page background       | White                                                |
| Toolbar / HUD overlay | White background, 1 px Light Gray border-bottom      |
| Modal / popover       | White, `box-shadow: 0 4px 24px rgba(11,74,105,0.12)` |
| 3D canvas             | Fills the available viewport; no border or shadow    |

---

## Depth-based Opacity (3D Scene)

Table boxes are semi-transparent by default to allow the user to see through the scene and understand spatial depth. As the camera approaches a box, the box becomes progressively more opaque so the label text is readable at close range.

| Camera distance to box                  | Fill opacity |
| --------------------------------------- | ------------ |
| Far (outside comfortable reading range) | 0.15 – 0.25  |
| Mid (approachable)                      | 0.45 – 0.65  |
| Close (label fully legible)             | 0.85 – 0.95  |

Opacity should transition smoothly (lerp per frame). The box edge/stroke remains fully opaque at all distances.

---

## Interactive States

| State                   | Treatment                                                          |
| ----------------------- | ------------------------------------------------------------------ |
| Default button          | Curious Blue fill, White label, no shadow                          |
| Button hover            | `#1580B8` (10% darkened Blue), cursor pointer                      |
| Button active / pressed | `#0B4A69` (Deep Sea Green fill), White label                       |
| Button disabled         | Light Gray fill, Deep Sea Green label at 40% opacity               |
| Focus ring              | `2px solid #1C95D3`, `2px offset` — never remove for keyboard a11y |
| 3D box hover            | Stroke width increases slightly; opacity nudges up                 |
| 3D box selected         | Stroke switches to Deep Sea Green; fill fully opaque               |

---

## Iconography

Use a single, consistent icon library (e.g., Lucide or Heroicons). Icons should:

- Be stroke-based (not filled), weight ≈ 1.5 px at 16 px size.
- Match the body text colour in their default state.
- Never appear without an accessible label (either visible or `aria-label`).

---

## Motion & Animation

Motion is purposeful and minimal.

| Interaction               | Animation                                                    |
| ------------------------- | ------------------------------------------------------------ |
| Camera orbit / zoom       | Physics-based damping (OrbitControls `enableDamping: true`)  |
| Reset view                | Smooth tween to default position over ≈ 600 ms, ease-in-out  |
| Box opacity on approach   | Linear lerp per frame, no easing required                    |
| Force simulation settling | Runs in real time; boxes drift to rest naturally             |
| UI panel appear           | No animation; appears instantly (or ≤ 150 ms fade if needed) |

Avoid decorative transitions, bounces, or spring effects. The aesthetic is confident and precise, not playful.

---

## Accessibility

- Colour contrast ratio ≥ 4.5 : 1 for all body text (Deep Sea Green on White passes at ≈ 10 : 1).
- Curious Blue on White: check specific text sizes against WCAG AA (large text ≥ 3 : 1, body ≥ 4.5 : 1).
- All interactive controls must be keyboard-focusable with a visible focus ring.
- Provide an `aria-label` on the 3D `<canvas>` element describing its contents.
- The HUD camera-reset button must be reachable via Tab and activatable via Enter/Space.

---

## Do / Don't

| Do                                               | Don't                                 |
| ------------------------------------------------ | ------------------------------------- |
| Use white space generously                       | Pack elements to fill space           |
| Use Curious Blue for one or two accents per view | Use Curious Blue as a background wash |
| Keep 3D scene text at a consistent, legible size | Let labels scale down below ≈14 px    |
| Use smooth, physics-based camera movement        | Use abrupt cuts or decorative bounces |
| Maintain a single Lexend weight per UI zone      | Mix weights or use italic             |
| Use stroke-based icons consistently              | Mix icon styles                       |
| Let opacity signal depth semantically            | Use opacity for decoration            |
