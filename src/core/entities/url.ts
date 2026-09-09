/**
 * Entity URL helper — the ONE place the `/<type>/<slug>` route shape is encoded
 * (Implementation Plan §7.1; Technical Architecture §7 "the URL describes the
 * resource").
 *
 * Routing (#19) and every entity link rendered anywhere on the site MUST go
 * through this so a future change to the route shape is a one-line edit here,
 * not a site-wide search-and-replace.
 *
 * Locale is deliberately NOT part of the path: English is the default locale and
 * the language toggle / `?lang=` override is a presentation concern, not a route
 * segment (Implementation Plan §7.2).
 */

import type { EntityType } from "./schemas";

/** Minimal shape needed to build an entity URL. */
export interface EntityUrlRef {
  type: EntityType;
  slug: string;
}

/** `/<type>/<slug>` — e.g. `entityUrlFromRef("person", "zane")` → `/person/zane`. */
export function entityUrlFromRef(type: EntityType, slug: string): string {
  return `/${type}/${slug}`;
}

/** `/<type>/<slug>` for a resolved entity (or anything carrying `type` + `slug`). */
export function entityUrl(entity: EntityUrlRef): string {
  return entityUrlFromRef(entity.type, entity.slug);
}
