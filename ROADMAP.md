# STELLAR ATTRACTOR — Roadmap

Derived from `docs/architecture/Implementation Plan v0.1.md` §11 (phase sequencing)
and the three source architecture documents it depends on. Phase ordering follows
architectural risk, not visual appeal (Technical Architecture §48).

**Locked decisions (Implementation Plan §1):** product name is STELLAR ATTRACTOR
everywhere; framework is Astro + vanilla TypeScript for cockpit/HUD;
Astronavigation is a **stub** for the MVP with real Local Bubble integration
deferred to Phase 7; **no deployment / domain / CI-deploy work is in scope** —
everything is local-only (`astro dev` / `astro preview`) until further notice.
All work lands in the `IncusLuminis/stellar-attractor-site` repo.

**Backlog board:** `IncusLuminis/projects/6` — "Stellar Attractor Universe"
(https://github.com/orgs/IncusLuminis/projects/6). All issues live in the
`IncusLuminis/stellar-attractor-site` repo and carry the `stellar attractor` label.
Epics: Phase 0 #1, Phase 1 #14, Phase 2 #23, Phase 3 #29, Phase 4 #36,
Phase 5 #43, Phase 6 #50, Phase 7 #55, Phase 8 #61.

## Status legend

- **Groomed to Ready** — Stories written with acceptance criteria + Size, ready to pick up.
- **Epic + coarse Stories** — captured; full grooming happens after the Phase 0
  findings note lands, because the spike's proceed/revise outcome feeds every
  cockpit-dependent Story.
- **Deferred** — captured, deliberately not groomed now.

---

## Phase 0 — Cockpit Interaction Prototype (spike) — GROOMED TO READY

**Outcome:** prove that the look-around → discover → focus → interact → return
loop feels natural in a real browser. Ends in a **human proceed / revise gate**.
Acceptance criteria from Cockpit Interaction Prototype Specification §37–38 and
deliverables from §40. Placeholder art only; no data, no Local Bubble.

Priority: **High** (Implementation Plan §13 — "the immediate next work").

| Issue | Story | Size |
|---|-------|------|
| #2 | Scaffold the isolated cockpit prototype + oversized static scene | M |
| #3 | Responsive camera bounds + `CameraController` skeleton with explicit state machine | M |
| #4 | Pointer-drag panning with click-vs-drag threshold | M |
| #5 | Panorama controls (◀ ▶) + keyboard navigation | S |
| #6 | First-use discovery signals (≥3) + hint dismissal | S |
| #7 | SVG Astronav hotspot with interaction states | S |
| #8 | Automatic camera focus transition + input lock | M |
| #9 | SystemOverlay + RETURN | S |
| #10 | Reduced-motion support | S |
| #11 | Mobile Remote Terminal fallback | M |
| #12 | Responsive-desktop resize hardening + interaction edge cases | M |
| #13 | Prototype README, standalone camera configuration, engineering findings note (proceed / revise) | M |

All Phase 0 issues are at Status `Ready` on the board. Phases 1–8 Epics and
their Stories are at `Backlog`.

---

## Phase 1 — Application core — EPIC + COARSE STORIES

**Outcome:** any seed entity opens by URL with correct content and working
relation links, in both locales.

- Astro project skeleton + local dev/build/preview scripts (validation + search-index as build pre-steps)
- Entity schema: Zod schemas + Astro content collections per entity type; JSON Schema mirrors in `/schemas`
- Entity + relation resolver
- CI entity-validation script (missing id, dup slug, dangling relation, missing ru/en, bad media ref) wired into `astro build` + a GitHub Actions check
- Routing + route↔system map + deep-link focus-intent contract; direct entity URLs render full content without the cockpit
- i18n: `LocalizedText`, client locale store, `?lang=` override, `hreflang` alternates; language switch never changes selected entity / camera / scroll / system state
- Astronavigation MVP **stub** + `AstronavAdapter` typed interface (placeholder panel, accepts deep-link focus intent, satisfies focus→activate→return loop) — also feeds Phase 3
- Phase 1 seed entity set: Zane, Illar Arden, Base #32, Stellar Nomad, Fomalhaut, Exodus — both locales, cross-class relations

## Phase 2 — Visual system — EPIC + COARSE STORIES

**Outcome:** a documented visual grammar exists before many screens are built.

- Wire HUD design tokens from `shared/style/stellar-attractor.css` into `hud.css`
- SVG HUD component library (HudFrame, HudCorners, HudReticle, HudScanner, HudStatus, HudTelemetry, HudBracket, HudDivider, HudTarget, HudAlert)
- Shared non-HUD UI: buttons, panels, alerts, language selector
- Terminal-transition + animation conventions + CSS-first animation primitives (all honour `prefers-reduced-motion`)
- Typography + colour scale documented as visual grammar

## Phase 3 — Cockpit MVP — EPIC + COARSE STORIES

**Outcome:** the site feels like Stellar Attractor even with placeholder terminal content.
Camera-model specifics depend on the Phase 0 findings note.

- Integrate production cockpit artwork replacing spike placeholder assets
- All primary terminal hotspots + camera targets in `config/cockpit.json`
- Cockpit ↔ system transitions wired through the navigation layer for every primary system
- First-use hint + panorama arrows + keyboard in the production shell
- RU/EN in the cockpit shell
- `MobileShell` / BASE #32 REMOTE TERMINAL production version mounting the same system views

## Phase 4 — Database Index + Personnel — EPIC + COARSE STORIES

**Outcome:** immersive and conventional navigation demonstrably coexist.

- Database Index: generated global entity listing + category browsing
- Search: build-time MiniSearch index from both locales + client search UI
- Filters on the Database Index
- Personnel browser + `PersonnelIndex` + direct `/person/[slug]` routes
- Person detail: portrait, biography, assignment, service history, relations, related records
- Restricted / guest presentation resolver ("RECORD EXISTS / ACCESS LEVEL: RESTRICTED / CLEARANCE REQUIRED")

## Phase 5 — Fleet Database — EPIC + COARSE STORIES

**Outcome:** a vessel is fully explorable in 2D; renderer boundary in place, no 3D.

- Vessel index + `/vessel/[slug]` routes
- `VesselViewer` with renderer boundary (ImageRenderer / SchematicRenderer / GalleryRenderer)
- Visual view: canonical hero images
- Schematic view: side / front / top with SVG hotspots
- Vessel specs + Commonwealth classification consumed as-is (purpose / range-autonomy / size-crew / AI-autonomy)
- Mission imagery view + related records

## Phase 6 — Base #32 — EPIC + COARSE STORIES

**Outcome:** Base #32 works as another spatial view into the entity graph.

- `StationViewer`: station illustration + SVG section hotspots + labels
- Data-driven station sections (only sections with real material)
- `SectionPanel`: related personnel / missions / media per section
- WebP previews per section; optional WebM living previews

## Phase 7 — Astronavigation (real Local Bubble integration) — DEFERRED

**Outcome:** real Local Bubble renders inside the Astronav terminal with the
fictional overlay; the LB renderer is not rewritten. Not groomed in detail now.

- Commission embed mode in `localbubble-site` — **separate issue filed against `IncusLuminis/localbubble-site`** (`?embed=1`, no LB chrome/cookie banner, focus/setLayer/setLocale handlers, `ready`/`select` events)
- Implement `AstronavAdapter` against the real engine behind the existing interface
- Locale sync + focus requests + entity deep links
- Stellar Attractor fictional overlay rendered from `data/astronav-layer/` on top of unchanged scientific data
- Lazy-load the Astronav bundle (outside the initial application path)

## Phase 8 — Media & polish — EPIC + COARSE STORIES

**Outcome:** the final impression of a living, operational system.

- Living previews rollout (WebP → intent → WebM → loop → stop; unload offscreen)
- Ambient animation + telemetry (restrained; reduced-motion)
- Boot sequence (short, skippable, not repeated for returning visitors)
- System transitions polish
- Loading + error states in-universe with correct HTTP status; Database Index always reachable
- Performance pass (fast shell, fast cockpit poster, lazy modules / video / astronav, no unnecessary 3D libraries)

---

## Explicitly out of scope for the MVP

3D spacecraft models / WebGL viewer; full Mission Archive; game backend;
persistent user state / accounts / paid membership implementation; deployment,
domain, Cloudflare project, CI deploy pipeline; full cinematic redesign of Local
Bubble; a second astronomical engine; a CMS. (Product Vision §26,
Implementation Plan §1.)
