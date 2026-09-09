/**
 * `getStaticPaths` bodies for the entity routes (#19 AC 1), factored out of the
 * `.astro` files so the path set is unit-testable without the Astro Vite plugin
 * (plain Vitest can't resolve `astro:content`; a route file can't be imported
 * there). The route files stay one line each; this is the logic.
 */

import type { EntityResolver } from "../entities/resolver";
import type { EntityType, UniverseEntity } from "../entities/schemas";

/** One entry per Astro `getStaticPaths()` result: `{ params, props }`. */
export interface EntityRoutePath {
  params: { slug: string };
  props: { entity: UniverseEntity };
}

/**
 * Every `/<type>/<slug>` path for one entity type, driven by the resolver
 * (content collections in production, an in-memory source in tests). The full
 * entity travels as a prop so the page renders without a second lookup.
 */
export async function entityStaticPaths(
  resolver: EntityResolver,
  type: EntityType,
): Promise<EntityRoutePath[]> {
  const list = await resolver.list(type);
  return list.map((entity) => ({
    params: { slug: entity.slug },
    props: { entity },
  }));
}
