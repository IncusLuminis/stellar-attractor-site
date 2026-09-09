/**
 * Navigation core types (#19; Implementation Plan §3 `core/navigation/`, §7.1;
 * Technical Architecture §7 route structure, §8 browser history, §33 Astronav
 * deep links).
 *
 * Framework-independent — this module imports only `../entities/schemas` for the
 * `EntityType` union. No Astro, no DOM.
 */

import type { EntityType } from "../entities/schemas";

export type { EntityType };

/* -------------------------------------------------------------------------- */
/*  System ids                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The primary systems reachable by a top-level route (Technical Architecture §7
 * route list, minus the entity routes). `cockpit` backs `/` — the default entry
 * environment, not a mandatory gate (§8).
 *
 * Order is canonical: it drives nothing today, but keep new systems appended.
 */
export const SYSTEM_IDS = [
  "cockpit",
  "astronav",
  "fleet",
  "personnel",
  "base32",
  "missions",
  "database",
] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];

/** Narrowing guard for an unknown string. */
export function isSystemId(value: unknown): value is SystemId {
  return typeof value === "string" && (SYSTEM_IDS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/*  Spatial systems                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Systems that present entities *in a space* and therefore act on a
 * {@link FocusIntent} by moving a camera / enabling map layers on mount
 * (Technical Architecture §33). Non-spatial systems (Personnel, Fleet, Database…)
 * still receive the intent — they "focus" by opening the entity's panel — but the
 * distinction matters to #21, which only wires the Astronav consumer.
 *
 * Phase 1: Astronav only. `base32` and `cockpit` may join later.
 */
export const SPATIAL_SYSTEMS: readonly SystemId[] = ["astronav"];

export function isSpatialSystem(system: SystemId): boolean {
  return SPATIAL_SYSTEMS.includes(system);
}

/* -------------------------------------------------------------------------- */
/*  Route resolution                                                           */
/* -------------------------------------------------------------------------- */

/**
 * What a pathname resolves to. `entityId` is the `<type>.<slug>` id for an
 * entity route (`/person/zane` → `person.zane`), or `null` for a bare system
 * route (`/personnel`) and for `/` (`cockpit`).
 */
export interface RouteResolution {
  system: SystemId;
  entityId: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Focus intent (the #21 contract)                                            */
/* -------------------------------------------------------------------------- */

/**
 * The deep-link → "show me this entity" instruction a system consumes on mount
 * (Technical Architecture §33; Implementation Plan §7.1).
 *
 * Derived from a route or an entity by the helpers in `./focus-intent`. The only
 * Phase 1 consumer is the Astronav stub (#21); see `./README.md` for the full
 * contract and the consumer expectations.
 *
 * `action` is a literal (`"focus"`) rather than a bare marker so the type can
 * grow a second verb later (`"focus" | "highlight" | …`) without a breaking
 * change to consumers that switch on it.
 */
export interface FocusIntent {
  system: SystemId;
  /** `<type>.<slug>` id of the entity to focus, e.g. `location.fomalhaut`. */
  entityId: string;
  action: "focus";
}
