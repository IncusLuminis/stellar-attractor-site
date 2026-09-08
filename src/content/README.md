# src/content/

Astro content collections for the universe entities. Implementation Plan §3, §4.

## Where the config actually lives

Implementation Plan §3 names `src/content/config.ts`. The installed Astro (7.3.1)
uses the **Content Layer**, whose config file is **`src/content.config.ts`** at
the `src/` root with a `glob()` loader per collection. We follow the installed
version's convention. This `src/content/` folder is kept for collection assets
and this note.

## Schemas

The Zod schemas are the single source of truth and live in
**`src/core/entities/schemas.ts`** (framework-independent — also consumed by the
CI validator `scripts/validate-entities.ts` (#18) and the JSON Schema generator
`scripts/generate-schemas.ts`). `src/content.config.ts` imports `entitySchemaFor`
from there and registers one collection per entity type.

## Collections → data directories

| Collection (`getCollection("…")`) | Files |
|---|---|
| `person` | `data/people/*.json` |
| `vessel` | `data/vessels/*.json` |
| `station` | `data/stations/*.json` |
| `location` | `data/locations/*.json` |
| `astronomical-object` | `data/astronomical-objects/*.json` |
| `mission` | `data/missions/*.json` |
| `event` | `data/events/*.json` |
| `organization` | `data/organizations/*.json` |
| `document` | `data/documents/*.json` |
| `media` | `data/media/*.json` |
| `science` | `data/science/*.json` |

A file that violates its schema fails `astro build` / `astro check` with the
collection, the entry, and the offending field named. Cross-file checks (dangling
`relation.target`, duplicate slugs, unresolvable media) are **#18**, not the
collection schema.

The `data/` directories ship empty (`.gitkeep`) — the Phase 1 seed set is #22.
Shape-example entities used by the schema tests live in `tests/fixtures/`, not
`data/`, so they do not collide with #22's authoring.
