# data/

The universe: repo-managed, version-controlled entity JSON — `people/`,
`vessels/`, `stations/`, `locations/`, `missions/`, `events/`, `documents/`,
`science/`, `astronav-layer/`. Schema-validated by `scripts/validate-entities.ts`
in CI and at build time. Implementation Plan §3, §4. Seed set authored in #16 / #22.

## Phase 1 seed set (#22)

Six entities that exercise relations between every major entity class without
needing graphics (Implementation Plan §4; Technical Architecture §45 Phase 1):

| File | id | Notes |
|---|---|---|
| `people/zane.json` | `person.zane` | |
| `people/illar-arden.json` | `person.illar-arden` | |
| `stations/base32.json` | `station.base32` | |
| `vessels/stellar-nomad.json` | `vessel.stellar-nomad` | name is a project-plan label, not canon (see below) |
| `locations/fomalhaut.json` | `location.fomalhaut` | astronomy facts are real-world, not canon (see below) |
| `missions/exodus.json` | `mission.exodus` | slug/id is a project-plan label; carries `restricted` clearance |

### Canon source

The bible is `shared/ai/docs/` (human, 2026-09-08 — "это канон, это библия", all
authoritative). Persona HR files are English; `world/` files are Russian. The
missing-language side of every `name` / `shortDescription` / `description` is a
faithful translation, not a drifting paraphrase.

### Field → source map

**`person.zane`** — `personas/HR files/Zane.md`
- `name` — "Full Name: Zane".
- position ("Research Specialist"), "Former Affiliation: Civil Exploration
  Corps", "Reports to: Admiral Illar Arden" — Identity block.
- "neither military personnel nor command staff" / "invaluable member of the
  scientific community aboard Base 32" — Executive Summary.
- "expeditions beyond the settled regions" / "humanity's first encounter with an
  unknown intelligent civilization" / "circumstances that remain classified" —
  Background.
- "almost his entire body was destroyed … only his brain survived" / cybernetic
  reconstruction / "reconstructed human whose identity endured" — Background;
  Human Nature.
- caretaker of a remote outpost near Fomalhaut / "a few years to nearly a quarter
  of a century" / "twenty-four years" — Executive Summary; Background.
- self-taught astronomy & astrophysics in isolation — Scientific Background.
- "never stopped considering himself human" / "never stopped considering himself
  a caretaker" — Human Nature; Internal Notes.
- `media` alt (white hair, kept beard, visible reconstruction on one side of the
  face) — Physical Appearance.
- `clearance: civilian` — "neither military personnel nor a member of the
  station's command staff"; "Civil Exploration Corps".
- Immutable list respected: Identity, History of the First Contact, Cybernetic
  reconstruction, Twenty-four years of isolation, Relationship with Admiral
  Arden, Communication style — none contradicted.

**`person.illar-arden`** — `personas/HR files/Arden.md` + `personas/HR files/Zane.md`
- `name` "Admiral Illar Arden" — Arden.md front-matter / Identity table
  ("Full Name: Admiral Illar Arden"; "Rank: Fleet Admiral").
- "strategic centre of gravity" / "defines long-term direction" / "maintains
  coherence between independent projects" / "accepts responsibility for the final
  decision" — Arden.md Executive Summary.
- hires people who know more than he does / expects to be challenged / starts
  from the mission / separates fact from opinion / "leadership means personal
  responsibility rather than authority" — Executive Summary; Decision Doctrine;
  Leadership Style.
- "speaks deliberately and economically" / "asks more questions than he gives
  answers" — Communication Style.
- "Zane reports to him" — Zane.md Identity ("Reports to: Admiral Illar Arden").
- "kept the first-contact incident from ending Zane's career in permanent
  disgrace" / "returned personally to rescue the man he had once sent to the edge
  of known space" / "restraint, mutual respect" / "almost identical voices … has
  never offered an explanation" — Zane.md, "Relationship with Admiral Illar
  Arden".
- Immutable respected: Identity, Leadership philosophy, Decision doctrine, Core
  values, Relationship with Zane.
- Note: Arden.md casts him as CEO of "Incus Luminis" (the meta-org). In-universe
  this file renders that as "senior executive authority behind Base #32 and its
  expeditions"; the org is not named. Arden.md `security_clearance: Omega` has no
  schema equivalent and is not mapped — a Fleet Admiral's public record is left
  at the schema default (no `clearance` key).

**`station.base32`** — `world/World Context.md` (§"База 32", lines ~1477–1485,
205, 1886) + `world/06-space-and-infrastructure/expedition-bases.md` +
`world/04-institutions/expedition-fleet.md`
- "leading research centre … comprehensive assessment of prospective worlds" /
  "expeditions work mainly in little-studied regions" / "detailed on-site study
  of worlds first located by automated probes" / "authoritative scientific school
  in planetology, exoworld ecology, habitability" / "conclusions treated as the
  final scientific word on settling a world" — World Context §"База 32".
- "corps of autonomous scientific stations … remote complexes far beyond the
  populated regions" — World Context §"Корпус автономных научных станций"
  ("База 32 является одной из таких станций").
- "regional expedition centre … coordinating study of an assigned region across
  many decades … field expeditions … long-term observation catalogues" —
  World Context §45; expedition-bases.md §"Районы исследований".
- autonomy (own power / manufacturing / medical / scientific infrastructure /
  multi-year supplies / works with no contact) — expedition-bases.md
  §"Принцип автономности".
- "research as a continuous chain handed between generations" —
  expedition-bases.md §"Преемственность исследований".
- "arrival of a ship is a major event" — expedition-bases.md §"Возвращение".
- home of Zane's scientific community — Zane.md, throughout.
- `clearance: guest` — a public Commonwealth research institution.

**`vessel.stellar-nomad`** — `world/04-institutions/expedition-fleet.md`
- Expedition Fleet as "one of the founding institutions of the Commonwealth" /
  "never built as an instrument of conquest" / purpose = sustain human presence
  beyond settled space / escorts expeditions, builds & supplies stations, secures
  routes, search & rescue — §27 opening + §"Роль в Содружестве".
- "the Fleet exists not for the sake of its ships but for the people they carry"
  — §"Основной принцип".
- officers "see themselves as explorers first" / trained across navigation,
  engineering, natural sciences, psychology, risk management — §"Культура Флота".
- on an expedition the commander has final authority over safety, the science
  programme stays with its own leader — §"Принятие решений".
- Base #32 runs field expeditions that such a vessel would support — World
  Context §45; expedition-bases.md.
- travelled to the Fomalhaut system for the Stellar Attractor expedition —
  Zane.md, "Relationship with Commander Marcus Kellan".
- **Name not in canon.** No individual Fleet vessel is named anywhere in the
  bible. "Stellar Nomad" is the seed identifier from Implementation Plan §4 /
  Technical Architecture §45. Recorded in the entity's own `description` and
  tagged `provisional-name`. Human decision needed: ratify the name into canon or
  rename to a canonical term.
- `clearance: guest`.

**`location.fomalhaut`** — `personas/HR files/Zane.md` + `personas/HR files/Brown.md`
+ real astronomy
- "remote scientific outpost orbiting Fomalhaut" / "the endless sky above
  Fomalhaut" / kept ~24 years by a single caretaker — Zane.md Executive Summary,
  Scientific Background.
- "the expedition to the Fomalhaut system in search of the phenomenon later known
  as the Stellar Attractor" / "the Stellar Attractor was destroyed before its
  nature could be understood" / expedition departed, Zane remained — Zane.md,
  "Relationship with Commander Marcus Kellan".
- "expedition to the remote Fomalhaut outpost" — Brown.md (line ~383).
- within Base #32's region of study — inference from World Context §45 +
  Zane being Base #32 personnel; stated as such.
- RU/EN search equivalence ("Фомальгаут" / "Fomalhaut") — Implementation Plan
  §far-navigation; Technical Architecture §13.
- **Astronomical parameters are real-world, not canon** (Alpha Piscis Austrini,
  ~25 ly, A-type main sequence, mag ~1.2, ~1.9 M☉, ~440 Myr, wide multiple
  system, debris disk, JWST 2023 nested rings). The bible gives no astronomy for
  the star. Supplied per the dispatch instruction ("pull it from real astronomy …
  and note it"), flagged in the entity's own `description`, tagged
  `real-star-reference`. `Fellow_Astrophysicist` review welcome but not blocking.
- `clearance: guest`.

**`mission.exodus`** — `personas/HR files/Zane.md`
- `name` "Stellar Attractor Expedition" — Zane.md, "Long-Term Memory / Projects:
  … Stellar Attractor Expedition"; described in "Relationship with Commander
  Marcus Kellan".
- Zane already alone at the outpost "for several years" when it arrived /
  "officially assigned only as caretaker, he quickly became an indispensable
  member of the expedition" / "knew the system better than anyone" — same section.
- "The expedition ultimately failed. The Stellar Attractor was destroyed before
  its nature could be understood." / expedition departed, "Zane remained behind"
  / "twenty years" until the return — same section; "Relationship with Colonel
  David Brown".
- task force under Admiral Arden returned to rescue Zane — Zane.md,
  "Relationship with Admiral Illar Arden" and "…with Commander Marcus Kellan".
- **Slug/id "exodus" is not a canon name** — it is the seed label from
  Implementation Plan §4 / Technical Architecture §45. Recorded in the entity's
  own `description`, tagged `provisional-name`.
- `clearance: restricted` — the deliberate non-`guest` seed for Phase 4's
  restricted-state work. Justification: Zane's first-contact circumstances are
  explicitly "classified" and their disclosure is escalation-only (Zane.md
  Background; Decision Authority → "Must Be Escalated"). **Open decision for the
  Product Owner:** canon treats "First Contact Expedition" and "Stellar Attractor
  Expedition" as two separate projects (both in Zane.md Projects). The 6-entity
  seed has one mission slot; a later phase may split this into two entities.

### Relation graph (all targets are one of the six; every class connected)

```
person.zane        --reports_to-->       person.illar-arden
person.zane        --rescued_by-->        person.illar-arden
person.zane        --assigned_to-->       station.base32
person.zane        --served_at-->         location.fomalhaut
person.zane        --participated_in-->   mission.exodus
person.zane        --traveled_aboard-->   vessel.stellar-nomad

person.illar-arden --commands-->          person.zane
person.illar-arden --rescued-->           person.zane
person.illar-arden --oversees-->          station.base32
person.illar-arden --directed-->          mission.exodus

station.base32     --supervised_by-->     person.illar-arden
station.base32     --hosts-->             person.zane
station.base32     --operates-->          vessel.stellar-nomad
station.base32     --conducted-->         mission.exodus
station.base32     --studies-->           location.fomalhaut

vessel.stellar-nomad --operated_by-->     station.base32
vessel.stellar-nomad --assigned_to-->     mission.exodus
vessel.stellar-nomad --traveled_to-->     location.fomalhaut
vessel.stellar-nomad --carried-->         person.zane

location.fomalhaut --site_of-->           mission.exodus
location.fomalhaut --former_post_of-->    person.zane
location.fomalhaut --studied_by-->        station.base32
location.fomalhaut --visited_by-->        vessel.stellar-nomad

mission.exodus     --occurred_at-->       location.fomalhaut
mission.exodus     --origin-->            station.base32
mission.exodus     --conducted_by-->      station.base32
mission.exodus     --directed_by-->       person.illar-arden
mission.exodus     --participant-->       person.zane
mission.exodus     --used_vessel-->       vessel.stellar-nomad
```

All ten class pairs (person, vessel, station, location, mission) are linked, in
both directions where natural.
