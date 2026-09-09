# src/core/navigation/

The route ↔ system map and the deep-link **focus-intent** contract. Issue #19,
Phase 1 / Epic #14. Implementation Plan §3 / §7.1; Technical Architecture §7
(route structure), §8 (browser history), §33 (Astronav deep links), §40
(SEO / indexability).

Framework-independent — imports only `../entities/*` and its own `./types`. Safe
from `.astro` frontmatter, client islands, build scripts and Vitest.

## Model

The URL describes the resource; the application decides the presentation
(Technical Architecture §7). `/person/zane` is a real, directly-addressable,
server-rendered document (`src/pages/person/[slug].astro` →
`src/components/EntityDocument.astro`). Opening it never requires navigating the
cockpit first (§8).

Layered on top: a **route → system** mapping so an immersive shell knows which
system should present a given URL, and a **focus intent** so that system knows
which entity to focus when it mounts.

## Route ↔ system map

`ENTITY_TYPE_SYSTEM` (in `route-system-map.ts`) is the single source of truth —
one table, no `switch` on entity type anywhere else.

| entity type          | system      | route example                        |
| -------------------- | ----------- | ------------------------------------ |
| `person`             | `personnel` | `/person/zane` → `person.zane`       |
| `vessel`             | `fleet`     | `/vessel/stellar-nomad`              |
| `station`            | `base32`    | `/station/base32`                    |
| `location`           | `astronav`  | `/location/fomalhaut`                |
| `astronomical-object`| `astronav`  | `/astronomical-object/<slug>`        |
| `mission`            | `missions`  | `/mission/exodus`                    |
| `event`              | `database`  | `/event/<slug>`                      |
| `organization`       | `database`  | `/organization/<slug>`               |
| `document`           | `database`  | `/document/<slug>`                   |
| `media`              | `database`  | `/media/<slug>`                      |
| `science`            | `database`  | `/science/<slug>`                    |

Bare system routes (`SYSTEM_ROUTE_PATH`): `/` → `cockpit`, `/astronav`,
`/fleet`, `/personnel`, `/base32`, `/missions`, `/database`.

```ts
import { routeToSystem, systemForEntity } from "../core/navigation";

routeToSystem("/person/zane");
// → { system: "personnel", entityId: "person.zane" }
routeToSystem("/location/fomalhaut");
// → { system: "astronav", entityId: "location.fomalhaut" }
routeToSystem("/personnel");
// → { system: "personnel", entityId: null }
routeToSystem("/");
// → { system: "cockpit", entityId: null }
routeToSystem("/nope/nope");
// → null

systemForEntity({ type: "location", id: "location.fomalhaut", slug: "fomalhaut" });
// → { system: "astronav", entityId: "location.fomalhaut" }
```

`routeToSystem` is pure string→mapping: it accepts a bare pathname or a full
URL, ignores query + hash, tolerates a trailing slash, and does **not** check
that the entity exists (that is `getStaticPaths` / the 404 route's job).

### Open decisions (flagged for Product_Owner in the #19 PR)

- **`station` → `base32`.** One station in the seed set (Base #32); one station
  route target. A generic stations browser is a later phase.
- **`event` / `organization` / `document` / `media` / `science` → `database`.**
  None has a dedicated system in Technical Architecture §7, so they resolve to
  the Database Index — the catch-all conventional-navigation surface (§28).
  `event` could later move to `missions` (timeline).

## Focus-intent contract (for #21)

```ts
interface FocusIntent {
  system: SystemId;   // "personnel" | "astronav" | "fleet" | "base32" | "missions" | "database" | "cockpit"
  entityId: string;   // "<type>.<slug>", e.g. "location.fomalhaut"
  action: "focus";
}
```

Build one with the helpers — never by hand:

```ts
import { focusIntentForRoute, focusIntentForEntity } from "../core/navigation";

focusIntentForRoute("/location/fomalhaut");
// → { system: "astronav", entityId: "location.fomalhaut", action: "focus" }
focusIntentForRoute("/personnel");   // bare system route
// → null
focusIntentForRoute("/");            // cockpit
// → null

focusIntentForEntity({ type: "location", id: "location.fomalhaut", slug: "fomalhaut" });
// → { system: "astronav", entityId: "location.fomalhaut", action: "focus" }
```

An intent is produced for **every** entity route, spatial or not. A non-spatial
system (Personnel, Fleet, Database) "focuses" by opening the entity's panel on
mount; a spatial system additionally moves a camera and enables map layers
(Technical Architecture §33).

`SPATIAL_SYSTEMS` / `isSpatialSystem` / `isSpatialFocusIntent` mark the
camera-driven systems. **Phase 1: `astronav` only.**

### Consumer expectations (#21 — the Astronav stub)

The Astronav stub is the only Phase 1 consumer. On mount it should:

1. read a `FocusIntent` handed to it by the route (`/location/fomalhaut` →
   `src/pages/astronav.astro` derives it via `focusIntentForRoute`, or the
   entity route hands it over — #21 chooses the wiring);
2. if `intent.action === "focus"` and `intent.system === "astronav"`: enable the
   layers the target needs, focus `intent.entityId`, open its entity panel
   (Technical Architecture §33). The stub may just log / render the id.

`FocusIntent` is a value type. It carries **no** camera coordinates, no layer
list, no locale — the consumer derives those from `intent.entityId` via the
`../entities` resolver. `action` is a string literal so a second verb
(`"highlight"`, …) can be added without breaking a consumer that switches on it.

### `/astronav` today

`src/pages/astronav.astro` is a **minimal placeholder** — heading + note.
#21 replaces the file with the real stub and wires the consumer above.

## Browser history

Every route is a real Astro page reached by a plain `<a href>`. There is **no
client-side router, no `history.pushState`/`popState` interception** anywhere in
`src/pages/` or `src/core/navigation/` (enforced by
`tests/navigation-no-history-hijack.test.ts`). Back / forward / bookmark / share
therefore work with zero extra code (Technical Architecture §8). A later phase
that adds soft transitions inside the cockpit must keep real URLs and real
history entries.

## `getStaticPaths`

`entityStaticPaths(resolver, type)` (in `static-paths.ts`) is the body of every
`/<type>/<slug>` route's `getStaticPaths()`, factored out so the path set is
unit-testable without the Astro Vite plugin. Production passes the `entities`
singleton; tests pass an `arrayEntitySource` resolver built from fixtures.

## Deferred work

### Per-locale RU entity routes — deferred (not Phase 1)

#20 renders the **default locale (`en`)** server-side and client-swaps to RU
after hydration; `hreflang` + canonical are emitted per route. Per-locale
`/ru/<type>/<slug>` prerendered routes for **full RU crawl parity** are **NOT**
implemented here and are **NOT** Phase 1.

> **Pre-deployment task (flagged for Product_Owner):** prerender per-locale RU
> entity routes for full RU crawl parity — deferred from #19 per the PR #74
> review ruling (acceptable to defer to pre-deployment). Revisit
> `buildHreflangAlternates`, the canonical logic in `BaseLayout.astro`, and this
> map when it is picked up.

### `src/core/clearance/`

The entity routes gate restricted records through `src/core/clearance/` — a
**minimal first cut** (presentation-only, binary content/locked, threshold at
`restricted`). The full resolver the Implementation Plan §3 anticipates
(per-field masking, an unlock flow) is a future story. Threshold decision is
documented in `src/core/clearance/index.ts` and flagged in the #19 PR.
