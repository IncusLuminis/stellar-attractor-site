/**
 * `src/core/entities/` — the content-agnostic entity + relation layer every
 * system view and route reads through (Implementation Plan §3; Technical
 * Architecture §2.1–2.2, §10, §28).
 *
 * Import surface:
 *   - `entities`                     — the shared, Astro-backed resolver singleton.
 *                                      Use this from routes / pages / islands.
 *   - `createEntityResolver`, `arrayEntitySource`
 *                                    — build a resolver over a custom source
 *                                      (tests, build scripts).
 *   - `entityUrl`, `entityUrlFromRef` — the one `/<type>/<slug>` implementation.
 *   - entity schemas / types         — re-exported from `./schemas`.
 *
 * Nothing outside this directory should import `astro:content` for entity data.
 */

export * from "./schemas";
export * from "./url";
export * from "./resolver";
export { astroEntitySource } from "./astro-source";

import { astroEntitySource } from "./astro-source";
import { createEntityResolver } from "./resolver";

/**
 * The process-wide entity resolver, backed by Astro's content collections.
 * Builds its lookup index once on first use and caches it for the build.
 */
export const entities = createEntityResolver(astroEntitySource());
