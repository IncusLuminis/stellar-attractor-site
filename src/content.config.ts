/**
 * Astro content collections — one per entity type (Implementation Plan §3, §4;
 * Technical Architecture §9).
 *
 * NOTE ON FILE LOCATION: Implementation Plan §3 predates the Astro Content Layer
 * and names this `src/content/config.ts`. The installed Astro (7.3.1) uses the
 * Content Layer, whose config file is `src/content.config.ts` with a `glob()`
 * loader per collection. We follow the installed version's convention;
 * `src/content/` is retained for collection assets and the schema README.
 *
 * Each collection is backed by JSON files under `data/<plural-type>/` (see
 * `ENTITY_DIRS` in `src/core/entities/schemas.ts`). A file that violates its
 * schema fails `astro build` / `astro check` with the file path and the
 * offending field named.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

import { ENTITY_DIRS, ENTITY_TYPES, entitySchemaFor } from "./core/entities/schemas";

const collectionEntries = ENTITY_TYPES.map((type) => {
  const collection = defineCollection({
    loader: glob({ pattern: "**/*.json", base: `./data/${ENTITY_DIRS[type]}` }),
    schema: entitySchemaFor(type),
  });
  return [type, collection] as const;
});

export const collections = Object.fromEntries(collectionEntries);
