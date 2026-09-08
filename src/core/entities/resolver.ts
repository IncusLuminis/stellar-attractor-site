/**
 * Entity + relation resolver (Story #17; Implementation Plan §3 `core/entities/`;
 * Technical Architecture §2.1 "interfaces render views of entities", §2.2 "one
 * entity, multiple representations", §10 relations, §28 Database Index).
 *
 * This is the single content-access point for the whole site. No system view,
 * route, or build script calls Astro's `getCollection` / `getEntry` directly —
 * they all read through a resolver so that:
 *   - lookup-by-id, lookup-by-type+slug and relation-following have one
 *     implementation and one set of edge-case semantics;
 *   - a dangling `relation.target` degrades gracefully at runtime instead of
 *     throwing (hard-failing on dangling targets at build/CI time is #18's job —
 *     this module performs NO cross-file integrity checking);
 *   - the resolver stays content-agnostic: it knows about entities and relations
 *     and nothing about Personnel / Fleet / Astronav / localization.
 *
 * Framework-independent: this module imports only `./schemas` and `./url`. The
 * Astro binding lives in `./astro-source.ts`; tests use `arrayEntitySource()`.
 */

import {
  ID_PATTERN,
  type EntityType,
  type LocalizedText,
  type UniverseEntity,
} from "./schemas";
import { entityUrl } from "./url";

/* -------------------------------------------------------------------------- */
/*  Public result types                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A resolved, link-ready reference to an entity — the shape every "related
 * records" panel, link list and the Database Index (§28) consume. Everything
 * needed to render a link without a second lookup.
 */
export interface EntityRef {
  id: string;
  type: EntityType;
  slug: string;
  name: LocalizedText;
  /** `/<type>/<slug>` (see `./url`). */
  url: string;
}

/** A `relations[]` entry whose `target` resolved to a real entity. */
export interface ResolvedRelation {
  resolved: true;
  /** Relation verb, verbatim from the source entity (`served_at`, …). */
  type: string;
  /** Target id, verbatim from the source entity. */
  target: string;
  /** The linked entity. */
  entity: EntityRef;
}

/**
 * A `relations[]` entry whose `target` could not be resolved. Returned, never
 * thrown — the caller renders around it (a struck-through label, a tooltip, …).
 */
export interface UnresolvedRelation {
  resolved: false;
  type: string;
  target: string;
  /**
   * `malformed-target` — `target` is not a `<type>.<slug>` id at all;
   * `not-found` — well-formed id, but no entity with it exists.
   */
  reason: "malformed-target" | "not-found";
}

export type RelationResolution = ResolvedRelation | UnresolvedRelation;

/** A reverse edge: `from` declares a `type` relation whose target is the queried entity. */
export interface ReverseRelation {
  /** Relation verb as declared on the source entity. */
  type: string;
  /** The entity that points at the queried one. */
  from: EntityRef;
}

/* -------------------------------------------------------------------------- */
/*  Content source                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The content backend a resolver reads through. Production wiring is
 * `astroEntitySource()` (`./astro-source`), which reads Astro's content
 * collections; unit tests pass an in-memory source via `arrayEntitySource()`.
 *
 * `all()` returns every entity across all 11 collections. It may be called more
 * than once; the resolver caches the first result for the life of the resolver
 * instance (content is static per build), so the source itself need not cache.
 */
export interface EntitySource {
  all(): Promise<readonly UniverseEntity[]>;
}

/** An `EntitySource` over an in-memory list — for tests and build-time tooling. */
export function arrayEntitySource(entities: Iterable<UniverseEntity>): EntitySource {
  const snapshot = [...entities];
  return { all: () => Promise.resolve(snapshot) };
}

/* -------------------------------------------------------------------------- */
/*  Resolver                                                                   */
/* -------------------------------------------------------------------------- */

export interface EntityResolver {
  /** Resolve by full id (`person.zane`). Unknown / malformed id → `undefined`. */
  getById(id: string): Promise<UniverseEntity | undefined>;
  /** Resolve by type + slug (`person`, `zane`). No match → `undefined`. */
  getByTypeSlug(type: EntityType, slug: string): Promise<UniverseEntity | undefined>;
  /** Every entity, optionally filtered to one type. Feeds the Database Index (§28). */
  list(type?: EntityType): Promise<readonly UniverseEntity[]>;
  /** Link-ready reference for an entity already in hand. */
  toRef(entity: UniverseEntity): EntityRef;
  /** Resolve a single relation-like `{ type, target }`. Never throws. */
  resolveRelation(relation: { type: string; target: string }): Promise<RelationResolution>;
  /** Resolve every `relations[]` entry of `entity`, in declared order. Never throws. */
  resolveRelations(entity: Pick<UniverseEntity, "relations">): Promise<RelationResolution[]>;
  /**
   * Every entity that declares a relation whose `target` is `idOrEntity` — for
   * "related records" panels (Phases 4–6). Accepts an id or an entity.
   */
  getReverseRelations(idOrEntity: string | UniverseEntity): Promise<ReverseRelation[]>;
}

interface EntityIndex {
  all: readonly UniverseEntity[];
  byId: Map<string, UniverseEntity>;
  byTypeSlug: Map<string, UniverseEntity>;
  /** target id → inbound edges. Built once per resolver instance. */
  reverse: Map<string, ReverseRelation[]>;
}

const typeSlugKey = (type: EntityType, slug: string): string => `${type}/${slug}`;

function toRef(entity: UniverseEntity): EntityRef {
  return {
    id: entity.id,
    type: entity.type,
    slug: entity.slug,
    name: entity.name,
    url: entityUrl(entity),
  };
}

/**
 * Create a resolver over a content source. Each instance builds its lookup
 * index (forward maps + the reverse-relation map) exactly once, lazily, on the
 * first query, and reuses it thereafter.
 *
 * Cost: one O(E + R) scan on first use (E = entities, R = total relation edges),
 * then O(1) id / type+slug / reverse-relation lookups and O(k) forward-relation
 * resolution for an entity with k relations.
 */
export function createEntityResolver(source: EntitySource): EntityResolver {
  let indexPromise: Promise<EntityIndex> | undefined;

  const buildIndex = (): Promise<EntityIndex> => {
    indexPromise ??= source.all().then((all) => {
      const byId = new Map<string, UniverseEntity>();
      const byTypeSlug = new Map<string, UniverseEntity>();
      const reverse = new Map<string, ReverseRelation[]>();

      for (const entity of all) {
        byId.set(entity.id, entity);
        byTypeSlug.set(typeSlugKey(entity.type, entity.slug), entity);
      }
      // Second pass: reverse edges. Separate from the first so the `from` ref is
      // built the same way regardless of declaration order.
      for (const entity of all) {
        for (const relation of entity.relations ?? []) {
          const edges = reverse.get(relation.target);
          const edge: ReverseRelation = { type: relation.type, from: toRef(entity) };
          if (edges) edges.push(edge);
          else reverse.set(relation.target, [edge]);
        }
      }

      return { all, byId, byTypeSlug, reverse };
    });
    return indexPromise;
  };

  const resolveRelation = async (relation: {
    type: string;
    target: string;
  }): Promise<RelationResolution> => {
    const { type, target } = relation;
    if (!ID_PATTERN.test(target)) {
      return { resolved: false, type, target, reason: "malformed-target" };
    }
    const entity = (await buildIndex()).byId.get(target);
    if (!entity) {
      return { resolved: false, type, target, reason: "not-found" };
    }
    return { resolved: true, type, target, entity: toRef(entity) };
  };

  return {
    async getById(id) {
      return (await buildIndex()).byId.get(id);
    },

    async getByTypeSlug(type, slug) {
      return (await buildIndex()).byTypeSlug.get(typeSlugKey(type, slug));
    },

    async list(type) {
      const { all } = await buildIndex();
      return type ? all.filter((entity) => entity.type === type) : all;
    },

    toRef,

    resolveRelation,

    async resolveRelations(entity) {
      const relations = entity.relations ?? [];
      return Promise.all(relations.map((relation) => resolveRelation(relation)));
    },

    async getReverseRelations(idOrEntity) {
      const id = typeof idOrEntity === "string" ? idOrEntity : idOrEntity.id;
      return (await buildIndex()).reverse.get(id) ?? [];
    },
  };
}
