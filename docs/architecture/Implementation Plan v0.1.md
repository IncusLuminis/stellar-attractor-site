STELLAR ATTRACTOR UNIVERSE

Implementation Plan

Version 0.1
Status: Internal working document
Depends on: Product Vision v0.1, Technical Architecture & MVP Implementation Plan v0.1, Cockpit Interaction Prototype Specification v0.1
Audience: IncusLuminis internal (engineering + PO)

⸻

0. PURPOSE OF THIS DOCUMENT

The three architecture documents define *what* to build and *why*. This document
records the concrete engineering decisions taken to start building it: the stack,
the repository layout, the integration strategy for Local Bubble, and the phase
sequencing that the Product Owner will decompose into a backlog.

It is deliberately decision-oriented, not a re-derivation of the concept. Where a
choice below contradicts nothing in the source documents, it is simply the
selected option; where it resolves an explicit "TBD", that is called out.

⸻

1. LOCKED DECISIONS (2026-09-08)

| # | Question | Decision |
|---|----------|----------|
| 1 | Product name / wordmark | **STELLAR ATTRACTOR** everywhere. The "STAR ATTRACTION" wording in early mockup 1 is dropped. Universe tagline: "AD ASTRA PER SCIENTIAM / THROUGH KNOWLEDGE — TO THE STARS". |
| 2 | Frontend framework | **Astro** (static-first, islands architecture). |
| 3 | Cockpit camera + HUD engine | **Vanilla TypeScript**, framework-independent modules, mounted as Astro islands. |
| 4 | Universe data | Repository-managed JSON entity files under `/data`, schema-validated in CI, surfaced through Astro content collections. No CMS. |
| 5 | Search | Client-side generated index (MiniSearch), built from both locales at build time. |
| 6 | Astronavigation | **Stub only for the MVP.** A self-contained placeholder `AstronavigationSystem` that satisfies the cockpit focus/return loop and the deep-link contract, with no Local Bubble dependency. Real Local Bubble integration is deferred and will be commissioned later as a separate issue against `localbubble-site` (an embed mode + `postMessage` bridge) once the rest of the application is stable. |
| 7 | Hosting / deployment | Deferred. No domain, no Cloudflare project, no CI deploy yet. **Everything runs and is tested locally** (`astro dev` / `astro preview`) until further notice. |
| 8 | Design tokens | Reuse the existing `shared/style/SA_styles.json` → `stellar-attractor.css` token system as the HUD design-token base. |
| 9 | Localization | RU + EN are both first-class. Locale is a client-side preference; both languages ship in the entity data. Switching language never changes the selected entity, camera position, or application state. |
| 10 | This plan's home | Plain Markdown in `docs/architecture/`. Internal documentation, not published. |

⸻

2. STACK RATIONALE

2.1 Astro

The Technical Architecture document (§4) asks for: static generation or server
rendering, good routing, code splitting, image optimization, localization support,
straightforward deployment, and integration with existing JavaScript modules —
while explicitly *not* depending on a specific framework conceptually.

Astro delivers all of this and matches the architectural decision summary (§52)
directly:

* `DOM > game engine` — Astro ships zero JavaScript by default; interactivity is
  opt-in per island.
* `direct URLs > application-only state` — every entity is a real prerendered
  route with real document content, which is also the SEO requirement (§40).
* `shared data > duplicated pages` — Astro content collections wrap the `/data`
  entity files with typed schemas (Zod), giving one validated source consumed by
  every system.
* `lazy loading > giant initial bundle` — `client:visible` / `client:idle`
  directives and per-route code splitting are built in; the cockpit island and
  the (future) Astronav island load independently of the shell.
* `progressive enhancement > mandatory effects` — a route renders its content
  server-side first; the immersive island enhances it.

2.2 Vanilla TypeScript for the cockpit and HUD

Per the Cockpit Prototype Spec (§30, §32–33) and Technical Architecture (Risk 1),
the camera controller must not know about Personnel/Astronav/Fleet data or
localization, must avoid heavy runtime dependencies, and must survive from the
spike into production. A plain `CameraController` class with an explicit state
machine is the right shape and carries no framework coupling. The HUD is an
SVG/CSS component library; Astro components render it, but the animation and
geometry are plain SVG + CSS custom properties.

This mirrors how `localbubble-site/web` is already built (vanilla TS + Vite, no
UI framework), so the two codebases stay conceptually compatible for the eventual
Astronav integration.

2.3 What we are NOT introducing

Three.js, PixiJS, Phaser, custom WebGL, physics or animation frameworks, a state
management library, or a CMS. (Three.js will re-enter the picture only via Local
Bubble, behind the Astronav adapter boundary, when that integration is
commissioned.)

⸻

3. REPOSITORY STRUCTURE

Astro conventions win where they conflict with the conceptual layout in
Technical Architecture §44.

```
stellar-attractor-site/
├── src/
│   ├── pages/                 # Astro routes
│   │   ├── index.astro        # /  → cockpit (desktop) / remote terminal (mobile)
│   │   ├── person/[slug].astro
│   │   ├── vessel/[slug].astro
│   │   ├── station/[slug].astro
│   │   ├── location/[slug].astro
│   │   ├── mission/[slug].astro
│   │   ├── event/[slug].astro
│   │   ├── document/[slug].astro
│   │   ├── science/[slug].astro
│   │   ├── astronav.astro
│   │   ├── fleet.astro
│   │   ├── personnel.astro
│   │   ├── base32.astro
│   │   ├── missions.astro
│   │   ├── database.astro
│   │   └── 404.astro          # in-universe "RECORD NOT FOUND", correct HTTP status
│   │
│   ├── shells/
│   │   ├── DesktopShell.astro     # cockpit environment
│   │   └── MobileShell.astro      # BASE #32 REMOTE TERMINAL
│   │
│   ├── systems/                   # one folder per primary system
│   │   ├── astronav/              # STUB for MVP
│   │   ├── fleet/
│   │   ├── personnel/
│   │   ├── base32/
│   │   ├── missions/
│   │   └── database/
│   │
│   ├── cockpit/                   # vanilla TS — no Astro imports
│   │   ├── camera-controller.ts   # position, scale, bounds, drag, transitions, focus
│   │   ├── scene.ts               # layer composition, transform application
│   │   ├── hotspots.ts            # SVG hotspot interaction + a11y
│   │   ├── discovery.ts           # first-use hint, nudge, dismissal
│   │   └── state-machine.ts       # BOOT → OVERVIEW → MANUAL_PAN → FOCUSING → SYSTEM_ACTIVE → RETURNING
│   │
│   ├── hud/                       # SVG/CSS component library
│   │   ├── HudFrame.astro  HudCorners.astro  HudReticle.astro  HudScanner.astro
│   │   ├── HudStatus.astro HudTelemetry.astro HudBracket.astro HudDivider.astro
│   │   ├── HudTarget.astro HudAlert.astro
│   │   └── hud.css                # imports shared/style tokens, adds component styles
│   │
│   ├── core/
│   │   ├── entities/              # entity resolver, relation resolver
│   │   ├── i18n/                  # locale store, LocalizedText helpers, RUS/ENG toggle
│   │   ├── search/                # MiniSearch wrapper (client) + index builder (build)
│   │   ├── navigation/            # route ↔ system mapping, deep-link → focus intent
│   │   └── clearance/             # guest / restricted presentation resolver
│   │
│   ├── media/
│   │   ├── UniverseImage.astro    # WebP/AVIF, responsive, lazy
│   │   ├── LivingPreview.astro    # WebP → intent → WebM → loop → stop
│   │   ├── EntityPortrait.astro
│   │   └── TechnicalDiagram.astro
│   │
│   ├── components/                # shared non-HUD UI (panels, buttons, alerts, language selector)
│   └── content/
│       └── config.ts             # Astro content collections + Zod schemas per entity type
│
├── data/                         # the universe — repo-managed, version-controlled
│   ├── people/         zane.json  illar-arden.json  ...
│   ├── vessels/        stellar-nomad.json  ...
│   ├── stations/       base32.json
│   ├── locations/      fomalhaut.json  ...
│   ├── missions/       exodus.json  ...
│   ├── events/
│   ├── documents/
│   ├── science/
│   └── astronav-layer/           # fictional overlay — kept separate from science data
│       ├── facilities/   fictional-worlds/   routes/   events/   annotations/
│
├── schemas/                      # JSON Schema mirrors of the Zod schemas, for external tooling / CI
│
├── config/
│   └── cockpit.json              # standalone camera config (spec §40.3):
│                                 #   scene size, overview position, system targets,
│                                 #   camera bounds model, animation timings
│
├── scripts/
│   ├── validate-entities.ts      # schema + referential integrity (dangling relations, dup slugs, missing translations, bad media refs)
│   ├── build-search-index.ts     # emits public/search-index.json from both locales
│   └── check-media-refs.ts
│
├── public/
│   └── media/                    # local media during development (external media strategy deferred with deployment)
│
├── shared/style/                 # existing — SA design tokens (do not fork)
└── docs/                         # this plan + the three source documents
```

⸻

4. UNIVERSE DATA MODEL

Straight from Technical Architecture §9–13, no changes.

```ts
type LocalizedText = { ru: string; en: string };

interface UniverseEntity {
  id: string;                        // "person.zane"
  type: EntityType;                  // person | vessel | station | location |
                                     // astronomical-object | mission | event |
                                     // organization | document | media | science
  slug: string;                      // "zane" → /person/zane
  name: LocalizedText;
  shortDescription?: LocalizedText;
  description?: LocalizedText;
  media?: MediaReference[];           // reference by id / stable path, never inline filenames in code
  relations?: { type: string; target: string }[];
  clearance?: "guest" | "civilian" | "authorized" | "restricted" | "classified";
  tags?: string[];
}
```

CI validation (`scripts/validate-entities.ts`, wired into `astro build` and a
GitHub Actions check) rejects:

* missing entity id, duplicate slug within a type;
* a relation whose `target` does not resolve to an existing entity;
* a missing required `ru` or `en` translation;
* a media reference that does not resolve.

The Database Index (§28) and the search index (§29) are **generated** from this
set. There is no separately maintained sitemap dataset. Every public entity is
therefore automatically discoverable and directly addressable.

`clearance` for the MVP only selects presentation: `guest-accessible → render
content`; `restricted → render locked state` ("RECORD EXISTS / ACCESS LEVEL:
RESTRICTED / CLEARANCE REQUIRED"). The field survives a future real
authentication implementation unchanged.

Phase 1 seed set (Technical Architecture §45 Phase 1): Zane, Illar Arden,
Base #32, Stellar Nomad, Fomalhaut, Exodus — sufficient to exercise relations
between every major entity class.

⸻

5. COCKPIT ENGINE

Implements the Cockpit Interaction Prototype Specification in full. Key points:

* **Scene**: bounded 2D, canonical `viewBox="0 0 3200 1600"`. Layers:
  background / ambient / hotspots / foreground. Transform:
  `translate3d(var(--camera-x), var(--camera-y), 0) scale(var(--camera-scale))`.
  No horizontal document scroll.
* **CameraController** (own class): `panBy` / `panTo` / `focus(target)` /
  `overview()`. Explicit state machine; input locked during `FOCUSING` /
  `RETURNING`. Bounds computed from scene size, viewport size, and scale;
  recomputed on resize. No hardcoded viewport-specific numbers.
* **Drag**: Pointer Events, 4–5 px threshold separating click from drag (critical
  — terminals are clickable objects inside a draggable scene). Inertia optional,
  restrained, "heavy" feel; omitted if it complicates the spike.
* **Hotspots**: SVG `polygon` / `path`, `role="button"`, `tabindex="0"`,
  `aria-label`. States: idle / hover / focus / active / disabled. Idle may be
  invisible; every invisible hotspot still has a semantic equivalent.
* **Focus transition**: 400–800 ms, controlled mechanical easing, no
  overshoot / bounce / spring.
* **Discovery** (≥3 signals): cropped console at a viewport edge; "DRAG TO LOOK
  AROUND" / localized hint; `cursor: grab`; one-time 20–30 px nudge. All respect
  `prefers-reduced-motion`.
* **Panorama controls**: `◀ ▶` buttons + keyboard (Left / Right / Esc /
  Enter-Space), active only while the cockpit area is focused; no global key
  hijacking.
* **Mobile**: below a behavioural compact breakpoint, render `MobileShell`
  (RemoteTerminal) — not a shrunken cockpit. Same system views, different shell.

Responsibility boundary (spec §33–34):

```
hotspot activate
    → navigation request  navigate("/astronav")
    → camera.focus("astronav")
    → transition complete
    → setActiveSystem("astronav")
```

The camera never fetches content; systems never drive the camera.

Deliverables of the Phase 0 spike (spec §40): working prototype (desktop +
mobile fallback), short README, standalone camera configuration, and an
engineering findings note ending in a **proceed / revise** recommendation.

⸻

6. HUD SYSTEM

* Component library under `src/hud/`, built once, not re-created per screen
  (Technical Architecture Risk 5).
* Design variables come from `shared/style/stellar-attractor.css`
  (`--sa-colors-cyan`, `--sa-colors-panel-bg`, `--sa-font-mono`, …). `hud.css`
  imports these and adds only component-level rules.
* Animation is CSS-first (transforms, opacity, SVG stroke, keyframes).
  `requestAnimationFrame` only where animation genuinely depends on continuous
  runtime state. Every animation honours `prefers-reduced-motion`.
* Guiding rule (Vision §19): at any moment most of the interface is stable; a
  small part is alive. Ambient behaviour signals presence, not spectacle.

⸻

7. ROUTING, LOCALIZATION, SEARCH

7.1 Routing

Route structure exactly as Technical Architecture §7. Each entity route
prerenders full document content (name, description, relations as links, media
metadata, `hreflang` alternates). Opening `/person/zane` directly must not
require navigating the cockpit first (§8). The cockpit is the default entry
environment, not a mandatory gate.

A route → system map lives in `src/core/navigation/`. `/person/zane` resolves to
system PERSONNEL, entity person.zane; `/location/fomalhaut` resolves to system
ASTRONAV (stub), entity location.fomalhaut, and carries a focus intent the
system consumes on mount.

7.2 Localization

`LocalizedText` fields ship both languages in the same JSON. The locale
preference is stored client-side (`localStorage`, with a `?lang=` override for
shareable links). Entity pages render the active locale server-side for SEO and
include the other locale for the client toggle; `hreflang` alternates are
emitted. Changing language re-renders text only — selected entity, camera
position, scroll position, and system state are untouched (Vision §22).

7.3 Search

`scripts/build-search-index.ts` emits `public/search-index.json` from names,
aliases, descriptions, tags, entity types, and related-entity names across
**both** locales. The client uses MiniSearch. "Фомальгаут" and "Fomalhaut"
resolve to the same entity regardless of the active language (Technical
Architecture §29). No search server.

⸻

8. ASTRONAVIGATION — MVP STUB

For this MVP the Astronavigation system is a self-contained placeholder. It
must:

* satisfy the cockpit focus → activate → return loop;
* render an in-universe placeholder panel ("ASTRONAVIGATION / SYSTEM ONLINE /
  LOCAL SPACE / COMMONWEALTH OVERLAY / [ PROTOTYPE MODULE ]");
* accept a deep-link focus intent (`/location/fomalhaut` opens the stub with a
  "focusing FOMALHAUT" state) so the routing contract is exercised end to end;
* expose the intended adapter surface as a typed interface only:

```ts
interface AstronavAdapter {
  mount(container: HTMLElement, options: AstronavOptions): void;
  destroy(): void;
  focusEntity(id: string): void;
  setLayer(id: string, enabled: boolean): void;
  setLocale(locale: "ru" | "en"): void;
  getState(): AstronavState;
  setState(state: AstronavState): void;
}
```

The stub implements this interface with placeholder behaviour. When the real
integration is commissioned, only the implementation behind this interface
changes.

**Deferred, not designed here:** the real integration is an embed mode +
`postMessage` bridge added to `localbubble-site` (`?embed=1`, no LB chrome/cookie
banner, handlers for focus / setLayer / setLocale, `ready` / `select` events),
plus the fictional overlay rendered from `data/astronav-layer/` on top of
unchanged scientific data (Technical Architecture §30–33). A separate issue will
be filed against `localbubble-site` when the rest of the application is stable.
Do not begin by rewriting Local Bubble's renderer.

⸻

9. ACCESSIBILITY, SEO, ERRORS

* Every spatial hotspot has a semantic control equivalent; keyboard navigation,
  visible focus states, sufficient contrast, meaningful alt text; no information
  available only on hover; Database Index is a full conventional-navigation
  fallback (Technical Architecture §39).
* Entity routes expose real document content independent of the cockpit island
  (§40).
* Errors keep the in-universe presentation where reasonable ("RECORD NOT FOUND",
  "ASTRONAVIGATION SYSTEM UNAVAILABLE") but return correct HTTP status; the user
  always retains access to Database Index / navigation (§42).

⸻

10. LOCAL DEVELOPMENT

Until deployment is decided:

* `npm run dev` → `astro dev` for development.
* `npm run build` → `astro build` (runs entity validation + search-index build as
  pre-steps) → `astro preview` to check the production build locally.
* `npm test` → entity validation, relation integrity, camera-controller unit
  tests (bounds math, click/drag threshold, state-machine transitions).
* Media is served from `public/media/` locally; the external media strategy is
  revisited together with deployment.

No Cloudflare project, no domain, no deploy pipeline is created at this stage.

⸻

11. PHASE SEQUENCING

Ordering follows architectural risk, not visual appeal (Technical Architecture
§48). Phases 1–8 map to Technical Architecture §45.

| Phase | Scope | Exit condition |
|-------|-------|----------------|
| **0 — Cockpit spike** | Isolated prototype per the Cockpit Prototype Spec: oversized scene, drag + bounds, one Astronav hotspot, automatic focus, SystemOverlay, RETURN, keyboard, reduced-motion, Mobile RemoteTerminal fallback. Placeholder art. No data, no Astro app, no Local Bubble. | The look-around → discover → focus → interact → return loop feels natural in a real browser. Deliverables per spec §40. **Human gate: proceed / revise.** |
| **1 — Application core** | Astro skeleton; routing; entity resolver; i18n; Zod schemas + CI validation; direct entity URLs; the 6-entity seed set. | Any seed entity opens by URL with correct content and working relation links, in both locales. |
| **2 — Visual system** | Typography, colour, HUD custom properties wired to `shared/style`, SVG frame library, buttons / panels / alerts, terminal-transition + animation conventions. | A documented visual grammar exists before many screens are built. |
| **3 — Cockpit MVP** | Production cockpit art replacing spike assets; all primary terminals + hotspots; first-use hint; nav arrows; camera focus; system transitions; RUS/ENG; Mobile shell. | The site feels like Stellar Attractor even with placeholder terminal content. |
| **4 — Database Index + Personnel** | Global entity listing; search UI; filters; Personnel browser; direct person routes; relations; restricted states. | Immersive and conventional navigation demonstrably coexist. |
| **5 — Fleet Database** | Vessel index; canonical hero images; specifications; Commonwealth classification consumed as-is; schematic view with SVG hotspots; mission imagery; related records. Renderer boundary in place, no 3D. | A vessel is fully explorable in 2D. |
| **6 — Base #32** | Station overview; section hotspots; related personnel / missions; WebP previews; optional WebM living previews. Only sections with real material. | Base #32 works as another spatial view into the entity graph. |
| **7 — Astronavigation (real)** | *Deferred.* Commission the `localbubble-site` embed mode; implement the adapter behind the existing interface; locale sync; focus requests; Stellar Attractor overlay layer; lazy-loaded bundle. | Real Local Bubble renders inside the Astronav terminal with the fictional overlay; LB renderer not rewritten. |
| **8 — Media & polish** | Living previews, ambient animation, telemetry, boot sequence, transitions, loading / error states, performance pass. | Final impression of a living, operational system. |

Parallelisable workstreams (Technical Architecture §46): A site core · B visual
assets · C HUD components · D (later) Local Bubble embed mode · E content,
translations, relations. Local Bubble and media production must not block the
core.

⸻

12. RISKS AND MITIGATIONS

Carried from Technical Architecture §49, with this plan's specifics:

1. **Over-engineering immersion** → DOM / CSS / SVG only; no real-time 3D without
   a concrete requirement; Astro ships no JS by default.
2. **Media explosion** → every entity must work with one canonical image; living
   previews are enhancement-only.
3. **Local Bubble coupling** → the `AstronavAdapter` interface exists from the
   stub onward; nothing else in the app imports Local Bubble.
4. **Navigation confusion** → explicit hint, arrows, automatic focus, Database
   Index, direct links; validated in the Phase 0 usability test.
5. **HUD inconsistency** → Phase 2 builds the HUD library before Phases 3–6.
6. **Content duplication** → single entity source + relations; CI blocks
   divergence.
7. **Premature CMS** → repo data first.
8. **Premature 3D** → 2D-only MVP with a documented renderer boundary in Fleet.

⸻

13. WHAT THE PRODUCT OWNER NEEDS TO DO

Decompose this plan into an Epic/Story backlog. Detail expectations:

* **Phase 0 is groomed to `Ready` now** — it is the immediate next work and its
  acceptance criteria come directly from the Cockpit Prototype Spec §37–38.
* **Phases 1–8 are captured as Epics with coarse Stories** — full grooming of
  each phase happens after the Phase 0 findings note lands, because the spike's
  proceed / revise outcome (and any camera-model changes it recommends) feeds
  the cockpit-dependent stories.
* Reflect the locked decisions in §1 — in particular: name is STELLAR ATTRACTOR;
  Astro; Astronavigation is a **stub** for the MVP with the real Local Bubble
  integration as a deferred Epic (Phase 7) that also spawns an issue against
  `localbubble-site`; no deployment / domain / CI-deploy work is in scope yet
  (local only).
* Acceptance criteria pulled from the source documents' own verification steps
  (Cockpit Prototype Spec §38, Technical Architecture §50) rather than invented.
* Maintain `ROADMAP.md` for this repo as the backlog takes shape.

⸻

14. OPEN QUESTIONS (non-blocking)

* Which GitHub Project board hosts this backlog (no Stellar Attractor board
  exists yet) — for the Product Owner to resolve with the human owner.
* Behavioural breakpoint values for compact / cockpit modes — to be set from the
  Phase 0 prototype, not from device names.
* External media hosting — revisited with the deployment decision.
