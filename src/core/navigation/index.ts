/**
 * `src/core/navigation/` — the route ↔ system map and the deep-link
 * focus-intent contract (#19; Implementation Plan §3, §7.1; Technical
 * Architecture §7, §8, §33).
 *
 * Import surface:
 *   - `routeToSystem(pathname)`      — pathname → `{ system, entityId }`
 *   - `systemForEntity(entity)`      — entity   → `{ system, entityId }`
 *   - `routeForEntity(entity)`       — entity   → `/<type>/<slug>`
 *   - `focusIntentForRoute` / `focusIntentForEntity` — build a `FocusIntent`
 *   - `FocusIntent`, `SystemId`, `RouteResolution` types
 *   - `SYSTEM_IDS`, `SPATIAL_SYSTEMS`, `ENTITY_TYPE_SYSTEM` tables
 *
 * Framework-independent — safe to import from `.astro` frontmatter, islands,
 * build scripts and Vitest alike. See `./README.md` for the #21 consumer
 * contract and the deferred-work notes.
 */

export {
  SYSTEM_IDS,
  SPATIAL_SYSTEMS,
  isSystemId,
  isSpatialSystem,
  type SystemId,
  type RouteResolution,
  type FocusIntent,
  type EntityType,
} from "./types";

export {
  ENTITY_TYPE_SYSTEM,
  SYSTEM_ROUTE_PATH,
  routeToSystem,
  systemForEntity,
  routeForEntity,
  type EntityLike,
} from "./route-system-map";

export {
  focusIntentForRoute,
  focusIntentForEntity,
  isSpatialFocusIntent,
} from "./focus-intent";

export { entityStaticPaths, type EntityRoutePath } from "./static-paths";
