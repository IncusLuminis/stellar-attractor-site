/**
 * Focus-intent derivation (#19 AC 6; Technical Architecture §33).
 *
 * A {@link FocusIntent} is the "show me this entity" instruction carried from a
 * deep link into the system that renders it. These helpers are the ONLY
 * sanctioned way to build one — #21 (Astronav stub) consumes the result and
 * must not reconstruct the shape by hand.
 *
 * See `./README.md` for the consumer contract.
 */

import { routeToSystem, systemForEntity, type EntityLike } from "./route-system-map";
import { isSpatialSystem, type FocusIntent } from "./types";

/**
 * Derive a focus intent from a pathname (or full URL). Returns `null` for bare
 * system routes (`/personnel`), for `/`, and for anything that does not resolve
 * to an entity route — there is nothing to focus.
 *
 * The intent is produced for EVERY entity route, spatial or not: a non-spatial
 * system (Personnel, Fleet…) "focuses" by opening the entity's panel on mount.
 * Use {@link isSpatialFocusIntent} when only camera-driven systems matter.
 */
export function focusIntentForRoute(pathnameOrUrl: string): FocusIntent | null {
  const resolved = routeToSystem(pathnameOrUrl);
  if (!resolved || resolved.entityId === null) return null;
  return { system: resolved.system, entityId: resolved.entityId, action: "focus" };
}

/**
 * Derive a focus intent from an entity already in hand
 * (`{ type, id, slug }`). Always returns an intent — every entity lives in some
 * system.
 */
export function focusIntentForEntity(entity: EntityLike): FocusIntent {
  const { system, entityId } = systemForEntity(entity);
  return { system, entityId: entityId as string, action: "focus" };
}

/** `true` when the intent targets a spatial system (Astronav today) — see `./types`. */
export function isSpatialFocusIntent(intent: FocusIntent): boolean {
  return isSpatialSystem(intent.system);
}
