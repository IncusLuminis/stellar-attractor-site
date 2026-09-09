# src/systems/astronav/

The Astronavigation **MVP stub** and the `AstronavAdapter` integration boundary.
Issue #21, Phase 1 / Epic #14. Implementation Plan v0.1 §1 (decision 6), §2.3,
§8, Risk 3; Technical Architecture §30 (integration boundary), §33 (deep links),
§37 (code splitting).

## The adapter boundary

`adapter.ts` defines `AstronavAdapter` **verbatim** from Implementation Plan §8 /
Technical Architecture §30:

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

`AstronavOptions` and `AstronavState` are plain, JSON-serializable value types —
they cross the Astro island prop boundary now and, in Phase 7, a `postMessage`
bridge. `AstronavState` is `{ focusedEntityId: string | null; layers:
Record<string, boolean>; locale: "ru" | "en" }` and is what
`AppState.astronavState` holds (Technical Architecture §6).

Stellar Attractor code must **only** touch Astronav through this interface. It
does not know, and must not care, whether the implementation behind it is an
imported package, a shared component, an `<iframe>` embed or a microfrontend
(Technical Architecture §30).

## Phase 1: the stub

`stub.ts` (`StubAstronavAdapter`, via `createAstronavAdapter()`) is the **only**
Phase 1 implementation. It is **pure DOM/TypeScript** — it imports **no** Local
Bubble code, **no** Three.js, **no** renderer library (Implementation Plan §2.3,
Risk 3). Enforced by `tests/astronav-no-renderer-imports.test.ts`.

`view.ts` builds the in-universe placeholder panel:

```
ASTRONAVIGATION
SYSTEM ONLINE
LOCAL SPACE            (map-layer toggle)
COMMONWEALTH OVERLAY   (map-layer toggle)
<status line>          FOCUSING FOMALHAUT / STANDING BY / RU equivalents
[ PROTOTYPE MODULE ]
```

- `focusEntity(id)` / a spatial deep-link intent → the status line reads
  `FOCUSING <ENTITY>` (the id's slug, upper-cased).
- `setLayer(id, enabled)` → tracked in `state.layers`, reflected in the toggle list.
- `setLocale("ru" | "en")` → the status line and the layer on/off words switch
  language. System chrome (`ASTRONAVIGATION`, layer labels) stays English, per
  #19's system-chrome precedent.
- `getState()` / `setState()` round-trip a plain `AstronavState` (deep-copied in
  and out — callers cannot mutate the adapter through a held reference).
- `mount` / `destroy` are leak-free: every listener is bound to an
  `AbortController` signal and the panel DOM is removed on `destroy`. Safe to
  call repeatedly.

### Visual design

Semantic, minimal, **unstyled** HTML. UI_UX_Designer is parked (human decision);
the panel is re-skinned in Phase 2/3 (#24–#28). Landmarks, heading order and the
layer list are the load-bearing contract; appearance is not.

## Wiring

| Route                 | Island                     | Focus intent                                                        |
| --------------------- | -------------------------- | ------------------------------------------------------------------- |
| `/astronav`           | `AstronavIsland client:load` | none — comes up `STANDING BY`                                     |
| `/location/[slug]`    | `AstronavIsland client:idle` | `focusIntentForEntity(entity)` (spatial only) → `FOCUSING <SLUG>` |

`/location/[slug].astro` computes the `FocusIntent` in frontmatter via
`focusIntentForEntity` + `isSpatialFocusIntent` (#19) and passes it as a plain
prop; `EntityDocument.astro` exposes a `system-mount` slot so the panel is
**additive** — the server-rendered record is untouched. This exercises the #19
routing contract end to end: `/location/fomalhaut` → spatial intent → stub
mounts focusing `FOMALHAUT`.

`mount.ts` is the vanilla shim (mirrors `src/cockpit-mount.ts`): it instantiates
the stub, mounts it in the page's current locale, applies the focus intent, and
subscribes the stub's `setLocale` to the RUS/ENG store.

## Phase 3 (#32) — cockpit wiring

Phase 3 wires the cockpit hotspot → focus → activate → return loop to a system
view. It mounts Astronav with `adapter.mount(container, options)` and tears it
down with `adapter.destroy()` on RETURN — exactly the lifecycle the stub already
satisfies (mount → drive → destroy, repeatable, leak-free). **No stub change is
needed for #32.**

## Phase 7 (#55, #56–#60) — real Local Bubble

When Phase 7 is commissioned, **only the implementation behind `AstronavAdapter`
changes.** A new adapter (a `localbubble-site` `?embed=1` iframe + `postMessage`
bridge, plus the fictional overlay from `data/astronav-layer/`) replaces
`StubAstronavAdapter`. `adapter.ts`, the routes, `mount.ts`, the Phase 3 cockpit
wiring and the interface-shape tests stay unchanged. That is the entire point of
the boundary (Implementation Plan §8, Technical Architecture §30).

**Deferred here (do not build in Phase 1):** real Local Bubble; the embed /
`postMessage` bridge; `data/astronav-layer/` overlay data + rendering;
lazy-loading the Astronav bundle (Technical Architecture §37). All Phase 7.
