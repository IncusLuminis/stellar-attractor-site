/**
 * `src/systems/astronav/` — the Astronavigation MVP stub and its adapter
 * boundary (#21, Phase 1 / Epic #14). See `./README.md`.
 *
 * Import surface:
 *   - `AstronavAdapter`, `AstronavOptions`, `AstronavState`, `AstronavLocale`
 *                                    — the fixed interface (Implementation Plan
 *                                      §8 / Technical Architecture §30)
 *   - `createAstronavAdapter()` / `StubAstronavAdapter`
 *                                    — the Phase 1 pure-DOM implementation
 *   - `mountAstronav()`              — the vanilla mount shim the island calls
 *   - `astronavStateFromFocusIntent`, `defaultAstronavState`, layer helpers
 *
 * The island wrapper (`AstronavIsland.tsx`) is imported directly by the routes.
 */

export type {
  AstronavAdapter,
  AstronavLocale,
  AstronavOptions,
  AstronavState,
} from "./adapter";

export { StubAstronavAdapter, createAstronavAdapter } from "./stub";

export {
  mountAstronav,
  type AstronavHandle,
  type AstronavMountOptions,
} from "./mount";

export {
  ASTRONAV_LAYER_IDS,
  ASTRONAV_LAYER_LABEL,
  type AstronavLayerId,
  astronavStateFromFocusIntent,
  cloneAstronavState,
  defaultAstronavState,
  entityShortLabel,
  layerLabel,
} from "./state";
