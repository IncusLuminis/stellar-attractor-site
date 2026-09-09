# Stellar Attractor — site

Interactive-universe site for the Stellar Attractor project. Astro application
shell with a framework-independent, vanilla-TypeScript cockpit / HUD engine
mounted as client islands.

Source of truth for scope and decisions:

- `docs/architecture/Implementation Plan v0.1.md` (§2 stack, §3 repo layout,
  §10 local development)
- `docs/architecture/Technical Architecture & MVP Implementation Plan v0.1 .md`
  (§4 framework, §5 shell, §37 code splitting, §44 repo structure)
- `docs/architecture/Cockpit Interaction Prototype Specification.md` (Phase 0)
- `ROADMAP.md` — phase sequencing and the Epic/Story backlog

> **Status: Phase 1 skeleton.** This is the Astro scaffold only (issue #15).
> Routing, entity data, i18n, schemas, the Astronav stub, the HUD library and
> the production cockpit land in later Phase 1–8 stories. The `/` route runs the
> Phase 0 cockpit prototype with placeholder art.

---

## How to run

Requires Node ≥ 20 (developed on Node 22).

```bash
npm install
npm run dev        # astro dev  → http://localhost:4321
npm run build      # astro build → dist/  (runs the prebuild pipeline first)
npm run preview    # astro preview — serve the production build
npm test           # vitest run — cockpit + framework-independence unit tests
npm run typecheck  # astro check — strict TS diagnostics over .astro / .ts / .tsx
```

### Build pipeline

`npm run build` runs an npm `prebuild` hook first:

```
prebuild ─┬─ validate:entities   → node scripts/validate-entities.ts   (#18 — live)
          └─ build:search-index  → node scripts/build-search-index.ts  (placeholder — Phase 4 / #38)
```

`validate-entities.ts` (#18) is **live**: it schema-validates every
`data/<type>/*.json` against the #16 Zod schemas and runs the cross-file
integrity checks (`Technical Architecture §12`) — duplicate `id`/`slug`, unknown
`type`, misfiled files, dangling `relation.target`, missing `ru`/`en`, and media
references that do not resolve (`scripts/check-media-refs.ts`). It prints a
report naming the file, entity id, field and reason, and exits non-zero on any
violation — failing the build. `npm run validate:entities` runs it standalone;
`npm run check:media-refs` is the media-reference-only view (`--media-only`).
`build:search-index.ts` is still a placeholder that exits 0. Implementation Plan §10.

### `npm test`

Runs the Phase 0 cockpit unit tests (`tests/` — camera bounds math at the four
Spec §25 viewport sizes, click-vs-drag threshold, every state-machine
transition, focus/return tweens on a fake clock, resize hardening) plus
`tests/cockpit-framework-independence.test.ts` (see below), the #16 entity-schema
tests, and `tests/validate-entities.test.ts` (#18 — one broken fixture per
`Technical Architecture §12` failure mode under `tests/fixtures/validate-entities/`,
each proving the validator exits non-zero with the right message). Entity /
relation resolver tests arrive with #17.

---

## Architecture

### Astro shell + islands

Astro renders every route to static HTML and ships **zero JavaScript by
default**. Interactivity is opt-in per component via `client:*` directives
(`client:load` / `client:idle` / `client:visible`) — the "islands" model
(Implementation Plan §2.1, Technical Architecture §37).

- `src/layouts/BaseLayout.astro` — the shared document shell. Pulls design
  tokens from `shared/style/` (see below). No JS.
- `src/pages/index.astro` — `/`. Renders server-side, then mounts the cockpit as
  a single island (`<CockpitIsland client:idle />`).
- `src/pages/placeholder.astro` — a plain content route with **no island**, kept
  as a scaffold smoke test: it ships no client JS and loads with no console
  errors. Deleted once real routes (#16 / #19) exist.

`@astrojs/preact` is the only UI-framework integration, and it is deliberately
minimal: it exists purely to make `client:*` directives usable. The Preact layer
is `src/components/CockpitIsland.tsx` — a ~20-line mount/unmount shim. All camera,
scene, hotspot and shell logic is plain TypeScript with no framework coupling
(Implementation Plan §2.2), which also keeps this codebase conceptually
compatible with `localbubble-site` (vanilla TS + Vite) for the eventual Astronav
integration.

### Code-splitting boundaries

Major systems are independently loadable (Technical Architecture §37). The
current and planned chunk boundaries:

| Boundary | Loads on | Status |
|---|---|---|
| **shell** (Astro HTML + tokens CSS) | every route | zero JS |
| **preact runtime** | any route with an island | ~4 KB, shared |
| **cockpit** (`src/cockpit-mount.ts` → `src/cockpit/*`, `src/shells/*`, `src/system/*`, `src/styles/cockpit.css`) | `/` only, `client:idle` | active |
| **core** (`src/core/*` — entities, i18n, search, navigation) | shell-level, shared | stub (#17, #19) |
| per-system: **astronav** / **fleet** / **personnel** / **base32** / **missions** / **database** (`src/systems/*`) | each system route / on focus | stubs (Phase 2+) |

Astronav will be the heaviest bundle and must stay outside the initial
application path (Technical Architecture §36–37) — it is lazy-loaded behind the
`AstronavAdapter` interface (Implementation Plan §8), added in #19.

### `src/cockpit/` is framework-independent — enforced

The modules under `src/cockpit/` are plain vanilla TS that must survive the
Phase 0 spike into production unchanged (Implementation Plan §2.2). They must not
import `astro:*` virtual modules, the `astro` runtime, `@astrojs/*`, `.astro`
components, or Preact/JSX.

`tests/cockpit-framework-independence.test.ts` scans every file under
`src/cockpit/` and fails the test run if any such import appears, so a later
story cannot quietly couple the engine to the framework.

`src/cockpit-mount.ts` (the folded-in harness, see below) is *app* glue, not part
of that directory — but it is also framework-free vanilla TS.

### Design tokens

`shared/style/` (generated from `shared/style/SA_styles.json` by
`shared/tools/gen_SA_styles.py`) is the single token source and is **not
forked** (Implementation Plan §1 decision 8). `src/styles/tokens.css` re-exports
`shared/style/stellar-attractor.css` via a plain CSS `@import` so the app has a
stable in-repo import path; `BaseLayout.astro` and `src/styles/cockpit.css` both
import that. When the HUD library lands (Phase 2), `src/hud/hud.css` imports the
same file. If a copy step is ever preferred over the relative import, it must be
wired into `prebuild` and documented here.

---

## Repository layout

Follows Implementation Plan §3; Astro conventions win where they conflict
(Technical Architecture §44).

```
src/
├── pages/         Astro routes (index.astro, placeholder.astro; entity routes → #19)
├── layouts/       BaseLayout.astro — shared document shell
├── components/    shared non-HUD UI + CockpitIsland.tsx (the island shim)
├── shells/        DesktopShell / MobileShell — vanilla TS (Astro shell components → Phase 3)
├── systems/       one folder per primary system — stubs (astronav is stub-only for the MVP)
├── cockpit/       vanilla TS engine — NO framework imports (enforced by a test)
├── system/        Phase 0 shared SystemOverlay / SystemContent (moves under components/ in Phase 2)
├── hud/           SVG/CSS HUD component library — Phase 2
├── core/          entities · i18n · search · navigation · clearance — Phase 1/4
├── media/         media components — Phase 5+
├── content/       Astro content collections + Zod schemas — #16
├── styles/        tokens.css (re-export of shared/style) + cockpit.css
└── cockpit-mount.ts   folded-in Phase 0 harness entry (was src/main.ts)

data/       universe entity JSON — #16 / #22
schemas/    JSON Schema mirrors of the Zod schemas — #16
config/     cockpit.json — standalone camera configuration (Spec §40.3)
scripts/    validate-entities.ts + check-media-refs.ts (#18, live) · build-search-index.ts (placeholder)
public/     static assets; public/media/ for local dev media
shared/style/   existing SA design tokens — do not fork
```

Empty scaffold directories carry a short `README.md` describing what lands there
and in which story.

---

## Phase 0 harness — now folded in

The Phase 0 cockpit spike ran on a bare Vite harness: root `index.html` +
`src/main.ts` + `src/style.css` + `vite.config.ts`. That harness is gone:

| Phase 0 (throwaway)      | Now                                                        |
|--------------------------|-----------------------------------------------------------|
| `index.html`             | `src/pages/index.astro` (+ `src/layouts/BaseLayout.astro`) |
| `src/main.ts`            | `src/cockpit-mount.ts` — same logic, exported as `mountCockpit(el)` with a teardown handle, called by `CockpitIsland.tsx` |
| `vite.config.ts`         | `astro.config.mjs` (Astro owns Vite; `build.sourcemap` carried over) |
| `src/style.css`          | `src/styles/cockpit.css` — its local `:root` token block removed; tokens now come from `shared/style/` unforked |
| `tsc --noEmit` in `build`| `npm run typecheck` → `astro check` |

`config/cockpit.json`, `config/cockpit.schema.json` and all of `src/cockpit/`,
`src/shells/`, `src/system/`, `tests/` are unchanged from Phase 0.

---

## Known limitations

- **Skeleton only.** No routing, entity data, content collections, i18n,
  schemas, Astronav stub, HUD library or production cockpit yet — those are
  Phase 1–8 stories (`ROADMAP.md`). `/` shows the Phase 0 prototype with
  placeholder SVG art.
- **`src/system/` vs `src/systems/`.** Phase 0's shared SystemOverlay /
  SystemContent live in `src/system/` (singular). Implementation Plan §3's
  `src/systems/` (plural) is for per-system folders and currently only holds a
  README. The singular folder moves under `src/components/` when the visual
  system is built (Phase 2).
- **`vite` is still a direct devDependency** — only as the peer that `vitest`
  needs. Astro brings its own Vite; there is no project `vite.config.ts`.
- **No deployment config by design** (Implementation Plan §1 decision 7): no
  `wrangler.*`, no adapter, no Pages config, no deploy workflow. Local
  `astro dev` / `astro preview` only. A CI workflow that only runs
  install + build + test is allowed and is authored in #18.
- Phase 0 findings from the §37 usability test are still pending — see
  `docs/phase-0-findings.md`. This story does not gate on that.

---

## Interaction controls (the `/` cockpit route)

Unchanged from Phase 0.

| Input | Action |
|---|---|
| Drag (pointer) | Look left / right; stops at scene boundaries |
| `◀` `▶` buttons | Pan one animated increment (non-drag alternative) |
| `←` / `→` | Pan (only while the cockpit area is focused) |
| Click / `Enter` / `Space` on **ASTRONAVIGATION** | Camera focuses the terminal, then the system overlay opens |
| `RETURN` button or `Esc` | Return the camera to the cockpit overview |
| `?shell=mobile` / `?shell=desktop` | Force a shell regardless of viewport width (QA / usability test) |

Below ~760 px the mobile **BASE #32 REMOTE TERMINAL** shell renders instead — a
distinct shell, not a shrunk cockpit. Under `prefers-reduced-motion: reduce` the
load nudge is skipped and camera tweens collapse to an instant cut.
