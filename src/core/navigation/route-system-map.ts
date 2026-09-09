/**
 * The route ↔ system map (#19 AC 5; Implementation Plan §7.1; Technical
 * Architecture §7).
 *
 * One data-driven table — `ENTITY_TYPE_SYSTEM` — is the single source of truth
 * for "which system presents this entity type". `routeToSystem` and
 * `systemForEntity` both read it; nothing switches on entity type anywhere else.
 *
 * Framework-independent: imports only `../entities` helpers and `./types`.
 */

import { ENTITY_TYPES, type EntityType } from "../entities/schemas";
import { entityUrlFromRef } from "../entities/url";
import {
  SYSTEM_IDS,
  isSystemId,
  type RouteResolution,
  type SystemId,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  entity type → system                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Which primary system renders each entity type (Technical Architecture §7
 * examples: `/person/zane` → PERSONNEL, `/location/fomalhaut` → ASTRONAV).
 *
 * Decisions that are NOT spelled out by §7 and are flagged for Product_Owner in
 * the #19 PR:
 *   - `station` → `base32`: there is one station in the seed set (Base #32) and
 *     one station route target. A generic "stations" browser is a later phase.
 *   - `event` / `organization` / `document` / `media` / `science` → `database`:
 *     none has a dedicated system in §7, so they resolve to the Database Index,
 *     the catch-all conventional-navigation surface (§28). `event` in
 *     particular could later move to `missions` (timeline).
 */
export const ENTITY_TYPE_SYSTEM: Record<EntityType, SystemId> = {
  person: "personnel",
  vessel: "fleet",
  station: "base32",
  location: "astronav",
  "astronomical-object": "astronav",
  mission: "missions",
  event: "database",
  organization: "database",
  document: "database",
  media: "database",
  science: "database",
};

/* -------------------------------------------------------------------------- */
/*  bare system routes                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Top-level system routes (Technical Architecture §7). `/` is the cockpit — the
 * default entry environment, not a mandatory gate (§8). The rest are 1:1 with a
 * `SystemId`.
 */
export const SYSTEM_ROUTE_PATH: Record<SystemId, string> = {
  cockpit: "/",
  astronav: "/astronav",
  fleet: "/fleet",
  personnel: "/personnel",
  base32: "/base32",
  missions: "/missions",
  database: "/database",
};

const PATH_SYSTEM_ROUTE: ReadonlyMap<string, SystemId> = new Map(
  SYSTEM_IDS.map((system) => [SYSTEM_ROUTE_PATH[system], system]),
);

/* -------------------------------------------------------------------------- */
/*  pathname parsing                                                           */
/* -------------------------------------------------------------------------- */

const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES);

/** Trim a trailing slash (but keep a bare `/`), strip query/hash if present. */
function normalizePath(pathname: string): string {
  let path = pathname.trim();
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";
  return path;
}

/**
 * Resolve a pathname to `{ system, entityId }` — the route ↔ system map.
 *
 *   `/`                    → `{ system: "cockpit",   entityId: null }`
 *   `/personnel`           → `{ system: "personnel", entityId: null }`
 *   `/person/zane`         → `{ system: "personnel", entityId: "person.zane" }`
 *   `/location/fomalhaut`  → `{ system: "astronav",  entityId: "location.fomalhaut" }`
 *   anything else          → `null`
 *
 * Accepts a bare pathname or a full URL string; query and hash are ignored. Does
 * NOT check that the entity exists — that is `getStaticPaths` / the 404 route's
 * job. This is a pure string→mapping function.
 */
export function routeToSystem(pathnameOrUrl: string): RouteResolution | null {
  if (typeof pathnameOrUrl !== "string" || pathnameOrUrl.trim() === "") return null;

  let pathname = pathnameOrUrl;
  try {
    // Full URL? take its pathname. Bare path? URL() throws, fall through.
    pathname = new URL(pathnameOrUrl).pathname;
  } catch {
    /* bare pathname */
  }

  const path = normalizePath(pathname);

  const bareSystem = PATH_SYSTEM_ROUTE.get(path);
  if (bareSystem) return { system: bareSystem, entityId: null };

  const segments = path.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const [type, slug] = segments;
  if (!ENTITY_TYPE_SET.has(type)) return null;
  if (!isEntitySlug(slug)) return null;

  const system = ENTITY_TYPE_SYSTEM[type as EntityType];
  return { system, entityId: `${type}.${slug}` };
}

/** Same slug shape the #16 schema enforces (`SLUG_PATTERN`), inlined to avoid coupling. */
function isEntitySlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/* -------------------------------------------------------------------------- */
/*  entity → system                                                            */
/* -------------------------------------------------------------------------- */

/** Minimal entity shape needed to place it in a system. */
export interface EntityLike {
  type: EntityType;
  id: string;
  slug: string;
}

/**
 * The system that presents an entity already in hand, plus its canonical id.
 * `systemForEntity({ type: "person", id: "person.zane", slug: "zane" })`
 *   → `{ system: "personnel", entityId: "person.zane" }`.
 */
export function systemForEntity(entity: EntityLike): RouteResolution {
  return { system: ENTITY_TYPE_SYSTEM[entity.type], entityId: entity.id };
}

/** The `/<type>/<slug>` route for an entity (wraps `../entities/url`). */
export function routeForEntity(entity: EntityLike): string {
  return entityUrlFromRef(entity.type, entity.slug);
}

export { isSystemId };
