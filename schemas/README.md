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
| `id` | string | yes | `<type>.<slug>`, e.g. `person.zane`. Mirror enforces `pattern: ^[a-z0-9-]+\.[a-z0-9-]+$` only — see caveat 1 below. |
| `type` | enum | yes | One of: `person`, `vessel`, `station`, `location`, `astronomical-object`, `mission`, `event`, `organization`, `document`, `media`, `science`. |
| `slug` | string | yes | Lowercase, URL-safe. `pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$`. |
| `name` | LocalizedText | yes | `{ ru, en }`, both present and non-blank. |
| `shortDescription` | LocalizedText | no | Both locales present and non-blank when the field is present. |
| `description` | LocalizedText | no | Both locales present and non-blank when the field is present. |
| `media` | MediaReference[] | no | `{ id, role?, alt?, caption? }`. `id` is a stable media id / path; the mirror `pattern` rejects a blank value or one ending in a known asset extension (case-insensitive): `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.svg`, `.mp4`, `.webm`, `.mov`, `.m4v`, `.mp3`, `.wav`, `.ogg`, `.pdf`. |
| `relations` | Relation[] | no | `{ type, target }`, both non-blank. Cross-file target resolution is #18, not this schema. |
| `clearance` | enum | no | One of: `guest`, `civilian`, `authorized`, `restricted`, `classified`. Presentation only for the MVP. |
| `tags` | string[] | no | Non-blank strings. |

Unknown properties are rejected at every object level (`additionalProperties: false`).

"Non-blank" in the mirrors is `minLength: 1` plus `pattern: "\\S"` (must contain a
non-whitespace character) — the closest JSON Schema can get to Zod's
`.trim().min(1)`.

## Constraints enforced by Zod / `astro build` but not (fully) by these mirrors

JSON Schema cannot express these; a tool validating against the mirrors alone
will be more permissive than `astro build`. Use the Zod schema directly where
the exact rule matters.

1. **`id` identity.** The mirror `pattern` only checks `id` is two
   dot-separated `[a-z0-9-]` segments. Zod additionally requires
   `id === `${type}.${slug}`` exactly (a cross-field `superRefine`).
2. **Whitespace trimming.** Zod `.trim()`s every `LocalizedText` field,
   `relation.type`/`target`, `media[].id` and `tags[]` *before* the
   non-empty check and stores the trimmed value. The mirrors only assert the
   value is non-blank (`pattern: "\\S"`); leading/trailing whitespace inside an
   otherwise non-blank value passes the mirror (the media-`id` `pattern` is the
   exception — it also forbids leading/trailing whitespace).

## Collections

One Astro content collection per entity type, backed by JSON under `data/`:
`person` → `data/people/`, `vessel` → `data/vessels/`, `station` → `data/stations/`, `location` → `data/locations/`, `astronomical-object` → `data/astronomical-objects/`, `mission` → `data/missions/`, `event` → `data/events/`, `organization` → `data/organizations/`, `document` → `data/documents/`, `media` → `data/media/`, `science` → `data/science/`.
