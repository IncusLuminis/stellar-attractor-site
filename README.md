# Stellar Attractor — Cockpit Interaction Prototype (Phase 0 spike)

> Isolated technical spike. It answers one question:
> **does navigating by physically looking around a large spacecraft cockpit feel
> natural, understandable and controllable in a browser?**

This is **not** the production site. It has placeholder artwork drawn in code, no
entity data, no CMS, no Local Bubble, no Astronavigation content. Phase 1 wraps
the reusable modules under `src/cockpit/` in an Astro app; the `index.html` /
`src/main.ts` / `src/style.css` harness here is throwaway.

Source of truth: `docs/architecture/Cockpit Interaction Prototype Specification.md`
and `docs/architecture/Implementation Plan v0.1.md` §5, §11.

---

## How to run

Requires Node ≥ 20.

```bash
npm install
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # serve the production build locally
npm test         # Vitest — camera-controller bounds / threshold / state-machine
```

`npm test` runs 35 unit tests (`tests/`) covering camera bounds math at the four
Spec §25 viewport sizes, the click-vs-drag threshold decision, every state-machine
transition, the focus/return tweens (deterministic fake clock), and resize
hardening.

### Shell override (for QA / the §37 usability test)

`?shell=mobile` or `?shell=desktop` forces a shell regardless of window width —
useful on hardware whose width does not naturally cross the breakpoint.

---

## Interaction controls

### Desktop cockpit

| Input | Action |
|---|---|
| Drag (pointer) | Look left / right. Stops at scene boundaries. |
| `◀` `▶` buttons | Pan one increment, animated. Accessible non-drag alternative. |
| `←` / `→` | Pan left / right (only while the cockpit area is focused). |
| Click / `Enter` / `Space` on the **ASTRONAVIGATION** terminal | Focus the terminal — the camera animates toward it, then the system overlay opens. |
| `RETURN — BACK TO MAIN OPERATIONS` button, or `Esc` | Return the camera to the cockpit overview. |
| First-use hint | "DRAG TO LOOK AROUND" — dismissed on the first drag, on `×`, or on opening a terminal. |

A small one-time nudge on load hints that the scene moves (skipped under reduced motion).

### Mobile (below ~760 px) — BASE #32 Remote Terminal

A distinct shell, not a shrunk cockpit. `[ ASTRONAVIGATION ]` opens the same
placeholder system content with no camera animation; `RETURN` restores the terminal.

### Reduced motion

Under `prefers-reduced-motion: reduce`: the load nudge is skipped, camera tweens
collapse to an instant cut, and decorative HUD animation stops. Every navigation
path still works.

---

## Architecture summary

```
src/
├── cockpit/                 framework-independent, app-agnostic — survives into production
│   ├── camera-controller.ts position / scale / bounds / drag / transitions / focus targets
│   │                        + pure helpers: computeBounds, clampCamera, resolveDragIntent, easeInOutCubic
│   ├── state-machine.ts     BOOT → OVERVIEW → MANUAL_PAN → FOCUSING → SYSTEM_ACTIVE → RETURNING
│   ├── scene.ts             layered SVG scene, CSS-transform application, Pointer Events, ResizeObserver
│   ├── hotspots.ts          SVG hotspot geometry in 3200×1600 space, a11y, visual states
│   ├── discovery.ts         first-use hint, one-time nudge, dismissal
│   ├── panorama-controls.ts ◀ ▶ buttons + keyboard, scoped to the cockpit area
│   └── config.ts            CockpitConfig types + runtime validator
├── system/
│   ├── system-content.ts    shared placeholder panel (desktop overlay AND mobile both use it)
│   └── system-overlay.ts    desktop HUD frame + RETURN
├── shells/
│   ├── desktop-shell.ts     wires the cockpit modules; enforces the Spec §34 flow
│   └── mobile-shell.ts      BASE #32 Remote Terminal
└── main.ts                  throwaway harness: load config, pick shell, swap on breakpoint cross

config/cockpit.json          standalone camera configuration (data, not code) — see below
```

**Responsibility boundary (Spec §33–34).** The camera controller owns position,
scale, bounds, drag and transitions, and takes only a target *name*
(`camera.focus("astronav")`). It never fetches content. The flow is:

```
hotspot activate → navigation request → camera.focus("astronav")
                 → transition complete → setActiveSystem("astronav")  [ open overlay ]
```

**Transform model.** The scene is a fixed `3200 × 1600` element with
`transform-origin: 0 0` and
`transform: translate3d(var(--camera-x), var(--camera-y), 0) scale(var(--camera-scale))`.
The document never scrolls horizontally. Pointer-move updates only write the
transform — no layout reads.

**Bounds (`config.camera.bounds.model: "cover"`).** Computed each frame from
scene size, viewport size and current scale — never hardcoded per viewport, and
recomputed on resize. `minHorizontalOverflowRatio` keeps the scene at least 1.35×
wider than the viewport so horizontal panning always stays useful;
`verticalPanRatio` allows a small vertical band.

**Standalone camera config — `config/cockpit.json`** (Spec §40.3): scene size,
overview pose, the Astronav focus target, the camera-bounds model parameters, and
all animation timings. Validated by `src/cockpit/config.ts` on load. A JSON Schema
is at `config/cockpit.schema.json`.

---

## Known limitations

- **Placeholder art only.** SVG shapes / gradients / labelled rectangles drawn in
  code. Production cockpit artwork is Phase 3 (Media_keeper).
- **One real hotspot.** Only the ASTRONAVIGATION terminal is interactive; the
  other five terminals are decorative. The mobile `[ DATABASE ]` button opens a
  generic stub panel.
- **Inertia is minimal** by design — the cockpit should feel heavy (Spec §12).
- **Vertical pan is a narrow band.** Primary movement is horizontal (Spec §8).
- **No cross-session persistence** of the hint (Spec §22 — not required for the spike).
- **Tab-visibility and animation.** Camera tweens use `requestAnimationFrame`;
  Chrome pauses rAF for a fully hidden tab, so a transition started and then
  backgrounded resumes when the tab returns to the foreground. `apply()` clamps
  every frame, so this self-heals with no stuck or out-of-bounds state.
- **Design tokens are inlined** in `src/style.css` rather than generated from
  `shared/style/` — the spike has no token build step yet (Implementation Plan §1.8).
- Findings from the §37 usability test are pending — see `docs/phase-0-findings.md`.
