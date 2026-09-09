/**
 * The production `EntitySource` — reads every entity out of Astro's content
 * collections (one collection per entity type, see `src/content.config.ts`).
 *
 * This is the ONLY module in the codebase that imports `astro:content`. Every
 * other consumer goes through a resolver (`./resolver`, `./index`). Keeping the
 * `astro:content` import isolated here also keeps `./resolver` loadable in plain
 * Vitest (no Astro vite plugin), where `astro:content` does not exist.
 */

import { getCollection } from "astro:content";

import { ENTITY_TYPES, type UniverseEntity } from "./schemas";
import type { EntitySource } from "./resolver";

/** An `EntitySource` backed by Astro content collections. */
export function astroEntitySource(): EntitySource {
  return {
    async all() {
      const perType = await Promise.all(
        ENTITY_TYPES.map((type) => getCollection(type)),
      );
      // Every collection's `schema` is `entitySchemaFor(type)`, so `entry.data`
      // is already a validated entity of that type.
      return perType.flat().map((entry) => entry.data as UniverseEntity);
    },
  };
}
