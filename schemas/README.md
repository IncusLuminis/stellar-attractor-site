# schemas/

JSON Schema (draft 2020-12) mirrors of the Zod entity schemas in
`src/core/entities/schemas.ts`, emitted for external tooling and the CI
validator (#18). Implementation Plan §3.

**Generated — do not edit by hand.** Run `npm run schemas:generate` after
changing the Zod schemas; `npm run schemas:check` (and a Vitest test) fail on
drift.

## Files

| File | Mirrors |
|---|---|
| `localized-text.schema.json` | `LocalizedText` |
| `media-reference.schema.json` | `MediaReference` |
| `relation.schema.json` | `Relation` |
| `clearance.schema.json` | `Clearance` |
| `universe-entity.schema.json` | `UniverseEntity` with `type` as the open enum |
| `<type>.schema.json` | `UniverseEntity` with `type` pinned to that literal, one per entity type |

## The `UniverseEntity` shape (Implementation Plan §4; Technical Architecture §9–10, §13, §27)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `<type>.<slug>`, e.g. `person.zane`. Pattern `^[a-z0-9-]+\.[a-z0-9-]+$`; the exact `id === type + "." + slug` rule is a Zod refinement (not in JSON Schema). |
| `type` | enum | yes | One of: `person`, `vessel`, `station`, `location`, `astronomical-object`, `mission`, `event`, `organization`, `document`, `media`, `science`. |
| `slug` | string | yes | Lowercase, URL-safe. Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`. |
| `name` | LocalizedText | yes | `{ ru, en }`, both non-empty. |
| `shortDescription` | LocalizedText | no | Both locales required when present. |
| `description` | LocalizedText | no | Both locales required when present. |
| `media` | MediaReference[] | no | `{ id, role?, alt?, caption? }`. `id` is a stable media id / path — an inline filename with an asset extension is rejected. |
| `relations` | Relation[] | no | `{ type, target }`, both non-empty. Target resolution across files is #18, not this schema. |
| `clearance` | enum | no | One of: `guest`, `civilian`, `authorized`, `restricted`, `classified`. Presentation only for the MVP. |
| `tags` | string[] | no | Non-empty strings. |

Unknown top-level keys are rejected (`additionalProperties: false`).

## Collections

One Astro content collection per entity type, backed by JSON under `data/`:
`person` → `data/people/`, `vessel` → `data/vessels/`, `station` → `data/stations/`, `location` → `data/locations/`, `astronomical-object` → `data/astronomical-objects/`, `mission` → `data/missions/`, `event` → `data/events/`, `organization` → `data/organizations/`, `document` → `data/documents/`, `media` → `data/media/`, `science` → `data/science/`.
