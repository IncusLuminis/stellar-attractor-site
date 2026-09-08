Второй документ уже делаем инженерным: он должен позволить начать реализацию MVP без повторного обсуждения общей концепции.

STELLAR ATTRACTOR UNIVERSE

Technical Architecture & MVP Implementation Plan

Version 0.1

Status: Draft Architecture
Depends on: Concept & Product Vision v0.1
Target: Web / Desktop / Mobile
Languages: Russian / English

⸻

1. PURPOSE

This document defines the initial technical architecture for the Stellar Attractor Universe interactive web experience.

The primary engineering objective is to implement the immersive experience defined in Product Vision without turning the project into a game-engine, 3D-modeling or custom-CMS project.

The implementation should maximize reuse of:

* existing Stellar Attractor media;
* existing Local Bubble / Local Cosmos technology;
* existing character and universe data;
* reusable SVG/HUD components;
* standard browser technologies.

The architecture must permit future expansion without requiring a rewrite of the MVP.

⸻

2. ARCHITECTURAL PRINCIPLES

2.1 Content and presentation are separate

Characters, vessels, locations, missions and other universe objects must not be encoded directly into visual pages.

Content exists independently as entities.

Interfaces render views of those entities.

Conceptually:

                 ENTITY DATA
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
      PERSONNEL    ASTRONAV    DATABASE
          │          │          │
          └──────────┼──────────┘
                     │
                     ▼
                    URL

⸻

2.2 One entity, multiple representations

A single entity may appear in several systems.

Example: Zane may appear in:

* Personnel;
* Base #32;
* Astronavigation;
* Mission Archive;
* Database Index;
* Search.

These systems must reference the same entity rather than duplicate its data.

⸻

2.3 Reuse before implementation

Before creating a new system, determine whether an existing Incus Luminis component or dataset can be reused.

Particularly:

Local Bubble → Astronavigation

Existing Stellar Attractor graphics → media library.

Existing character data → Personnel.

Existing ship classification → Fleet Database. The current classification manual already defines purpose, range/autonomy, size/crew and AI-autonomy categories, so Fleet should consume that taxonomy rather than create a parallel one.

⸻

2.4 Progressive enhancement

The application must remain navigable if advanced visual behavior is unavailable.

For example:

Panoramic cockpit
        ↓ fallback
Static cockpit
        ↓ fallback
Database navigation

Likewise:

WebM preview
    ↓
WebP preview

Immersion is an enhancement over functional navigation, not a dependency for it.

⸻

3. HIGH-LEVEL ARCHITECTURE

Recommended logical architecture:

┌─────────────────────────────────────────────┐
│                 WEB CLIENT                  │
│                                             │
│ Cockpit / Remote Terminal / System Views    │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              APPLICATION CORE               │
│                                             │
│ Router                                      │
│ Entity Resolver                             │
│ Localization                               │
│ Search                                      │
│ Relationship Resolver                       │
│ Application State                           │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌───────────────────┐
│ UNIVERSE DATA │  │ ASTRONAVIGATION   │
│               │  │                   │
│ Entities      │  │ Local Bubble      │
│ Relations     │  │ engine            │
│ Media refs    │  │ + SA overlay      │
└───────────────┘  └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│                  MEDIA                      │
│                                             │
│ WebP / AVIF / WebM / SVG / Video            │
└─────────────────────────────────────────────┘

⸻

4. FRONTEND APPLICATION

The Stellar Attractor site should be implemented as a modern client-side web application with server-renderable/directly addressable entity routes where practical.

The precise framework may be selected during implementation.

Framework selection should prioritize:

* static generation or server rendering;
* good routing;
* code splitting;
* image optimization;
* localization support;
* straightforward deployment;
* integration with existing JavaScript modules.

The architecture must not depend on a specific framework conceptually.

⸻

5. APPLICATION SHELL

The application shell contains functionality shared by all systems.

Conceptual structure:

App
├── Router
├── LocaleProvider
├── UniverseProvider
├── NavigationController
├── AudioController       // optional / post-MVP
├── HUDLayer
├── SystemTransitionLayer
└── CurrentSystem

The shell remains mounted while the user moves between systems.

This permits transitions such as:

Cockpit → Astronav → Cockpit

without reconstructing the complete application.

⸻

6. APPLICATION STATE

Only state necessary for the current experience should initially be maintained.

Example:

interface AppState {
  locale: "ru" | "en";
  currentSystem: SystemId;
  selectedEntityId?: string;
  cockpitCamera?: CockpitCameraState;
  astronavState?: AstronavState;
}

MVP state is primarily session-local.

Persistent player progression is explicitly outside scope.

Potentially persistent preferences:

* language;
* reduced animation preference;
* optional visual mode.

⸻

7. ROUTING

Every important object must remain directly addressable.

Recommended conceptual route structure:

/
 /person/:slug
 /vessel/:slug
 /station/:slug
 /location/:slug
 /mission/:slug
 /event/:slug
 /document/:slug
 /science/:slug
 /astronav
 /fleet
 /personnel
 /base32
 /missions
 /database

The URL describes the resource.

The application determines the immersive presentation.

Example:

/person/zane

may resolve to:

System: PERSONNEL
Entity: person.zane

while:

/location/fomalhaut

may resolve to:

System: ASTRONAV
Entity: location.fomalhaut

⸻

8. BROWSER HISTORY

Immersive navigation must respect normal browser behavior.

Back must return to the previous meaningful application state.

Forward must restore it.

Direct links must be shareable.

Opening a shared entity URL must not require manually navigating through the cockpit first.

The cockpit is the default entry environment, not a mandatory navigation gate.

⸻

9. UNIVERSE DATA MODEL

The initial entity schema should remain intentionally simple.

Conceptual base type:

type LocalizedText = {
  ru: string;
  en: string;
};
interface UniverseEntity {
  id: string;
  type: EntityType;
  slug: string;
  name: LocalizedText;
  shortDescription?: LocalizedText;
  description?: LocalizedText;
  media?: MediaReference[];
  relations?: Relation[];
  status?: string;
  tags?: string[];
}

Entity types:

type EntityType =
  | "person"
  | "vessel"
  | "station"
  | "location"
  | "astronomical-object"
  | "mission"
  | "event"
  | "organization"
  | "document"
  | "media"
  | "science";

⸻

10. RELATIONSHIPS

Relations connect entities without hardcoding UI behavior.

Concept:

interface Relation {
  type: string;
  target: string;
}

Example:

{
  "id": "person.zane",
  "relations": [
    {
      "type": "served_at",
      "target": "location.fomalhaut-outpost"
    },
    {
      "type": "participated_in",
      "target": "mission.exodus"
    },
    {
      "type": "assigned_to",
      "target": "station.base32"
    }
  ]
}

UI systems decide how those relations are presented.

⸻

11. DATA STORAGE — MVP

A dedicated database is not automatically required.

For the initial amount of content, repository-managed structured data may be sufficient.

Example:

/data
  /people
    zane.json
    illar-arden.json
  /vessels
    stellar-nomad.json
  /stations
    base32.json
  /locations
    fomalhaut.json
  /missions
    exodus.json

Advantages:

* version controlled;
* simple;
* transparent;
* easy to validate;
* easy for AI coding agents to edit;
* no CMS dependency;
* trivial backup.

A CMS can be introduced later if manual content management becomes painful.

⸻

12. SCHEMA VALIDATION

Entity data should be schema-validated during build or CI.

Invalid references should fail validation.

Examples:

* missing entity ID;
* duplicate slug;
* relation to nonexistent entity;
* missing required translation;
* invalid media reference.

This prevents gradual corruption of the universe database.

⸻

13. LOCALIZATION

Russian and English content belong to the same entity.

Do not maintain separate RU and ENG site structures.

Preferred:

{
  "name": {
    "ru": "База №32",
    "en": "Base #32"
  }
}

Not:

/data/en/base32.json
/data/ru/base32.json

The first approach prevents entity structures and relationships from diverging between languages.

⸻

14. COCKPIT SCENE

The desktop cockpit is implemented as a bounded 2D scene.

A true HTML <canvas> is not required.

Preferred architecture:

CockpitViewport
    │
    └── CockpitScene
          ├── BackgroundLayer
          ├── AmbientLayer
          ├── HUDLayer
          ├── HotspotLayer
          └── ForegroundLayer

The scene is transformed relative to the viewport.

Example conceptual transform:

transform:
  translate3d(var(--camera-x), var(--camera-y), 0)
  scale(var(--camera-scale));

⸻

15. COCKPIT COORDINATE SYSTEM

All scene elements should share a normalized or canonical coordinate system.

Example canonical design size:

3200 × 1600

Hotspots and overlays use the same coordinates.

SVG is particularly suitable:

<svg viewBox="0 0 3200 1600">

This permits responsive scaling without manually recalculating hotspot coordinates.

⸻

16. COCKPIT CAMERA

The camera requires:

* bounded horizontal pan;
* optional small vertical movement;
* pointer drag;
* touch support where appropriate;
* automatic focus;
* return to overview;
* reduced-motion behavior.

Conceptual API:

camera.panTo(x, y);
camera.focus("astronav");
camera.overview();

System positions should be configuration data rather than hardcoded throughout UI components.

Example:

const cockpitTargets = {
  astronav: { x: 1180, y: 460, scale: 1.35 },
  fleet: { x: 650, y: 520, scale: 1.3 },
  personnel: { x: 900, y: 540, scale: 1.3 },
  science: { x: 1900, y: 520, scale: 1.3 }
};

⸻

17. HOTSPOTS

Interactive regions should preferably use SVG geometry.

Supported shapes may include:

* rectangle;
* polygon;
* circle;
* arbitrary SVG path.

Concept:

<polygon
  data-target="astronav"
  points="..."
/>

Hotspots must support:

* pointer interaction;
* keyboard focus;
* accessible label;
* hover/focus visualization;
* selected state.

Invisible clickable areas must still have accessible equivalents.

⸻

18. SYSTEM TRANSITIONS

Transitions create the illusion that the interface exists physically inside Base #32.

A transition might consist of:

SELECT TERMINAL
      ↓
CAMERA FOCUS
      ↓
TERMINAL ACTIVATION
      ↓
HUD FRAME EXPANSION
      ↓
SYSTEM CONTENT

Transition effects should be CSS/SVG based wherever possible.

Avoid expensive video transitions unless they materially improve the experience.

⸻

19. SVG / HUD COMPONENT LIBRARY

HUD should be treated as a component system rather than decoration embedded independently into pages.

Potential structure:

/ui/hud
  HudFrame
  HudCorners
  HudReticle
  HudScanner
  HudStatus
  HudTelemetry
  HudBracket
  HudDivider
  HudTarget
  HudAlert

Common design variables should be centralized.

Example:

:root {
  --hud-bg: #061018;
  --hud-line: #5ccfff;
  --hud-text: #d8f3ff;
  --hud-muted: #668b9c;
  --hud-warning: #d89a52;
  --hud-line-width: 1px;
  --hud-radius: 4px;
}

Final values are design-system decisions.

⸻

20. HUD ANIMATION

Animations should use CSS where possible.

JavaScript should control state rather than continuously calculate decorative animation.

Preferred:

CSS transforms
CSS opacity
SVG stroke animation
CSS keyframes

Use requestAnimationFrame only when animation genuinely depends on continuous runtime state.

All animation must support:

@media (prefers-reduced-motion: reduce)

⸻

21. MEDIA COMPONENTS

Media behavior should be standardized.

Conceptual components:

UniverseImage
LivingPreview
MissionVideo
TechnicalDiagram
EntityPortrait

This avoids implementing video behavior separately on every screen.

⸻

22. LIVING PREVIEW

Desktop behavior:

initial:
WebP
hover/focus:
load WebM
play
leave:
stop
return to WebP

Do not preload dozens of WebM files on initial page load.

Potential lifecycle:

thumbnail visible
      ↓
preload metadata / poster
      ↓
user intent
      ↓
fetch video
      ↓
play loop

Mobile may use explicit tap or static images only.

⸻

23. MEDIA DIRECTORY

Suggested conceptual organization:

/public/media
  /people
  /vessels
  /base32
  /locations
  /missions
  /hud

Entity data references media IDs or stable asset paths.

Avoid embedding arbitrary asset filenames throughout presentation code.

⸻

24. BASE #32 DIRECTORY

Base #32 can reuse the same interaction primitives as the cockpit.

Architecture:

StationViewer
├── StationImage
├── StationHotspots
├── StationLabels
├── SectionPanel
└── LivingPreview

Sections are data-driven.

Example:

interface StationSection {
  id: string;
  name: LocalizedText;
  hotspot: SvgGeometry;
  image: string;
  previewVideo?: string;
  relatedEntities: string[];
}

⸻

25. FLEET DATABASE

MVP Fleet Database remains 2D.

Architecture:

FleetBrowser
├── FleetIndex
├── VesselViewer
│    ├── VisualView
│    ├── SchematicView
│    └── MissionImageryView
├── VesselSpecs
└── RelatedRecords

VesselViewer should expose a renderer boundary.

Concept:

interface VesselRenderer {
  render(entity: VesselEntity): View;
}

MVP implementations:

ImageRenderer
SchematicRenderer
GalleryRenderer

Future:

Model3DRenderer

No MVP data model should require 3D assets.

⸻

26. PERSONNEL

Personnel uses the generic entity infrastructure.

Concept:

PersonnelBrowser
├── PersonnelIndex
├── Portrait
├── Biography
├── Assignment
├── ServiceHistory
├── Relations
└── RelatedRecords

Restricted fields can be represented at the field or record level.

⸻

27. ACCESS METADATA

Entities or fields may optionally define clearance.

Concept:

type Clearance =
  | "guest"
  | "civilian"
  | "authorized"
  | "restricted"
  | "classified";

Example:

{
  "clearance": "restricted"
}

For MVP, the resolver may simply determine presentation:

guest-accessible
      ↓
render content
restricted
      ↓
render locked state

The model therefore survives future authentication implementation.

⸻

28. DATABASE INDEX

Database Index is generated from entity data.

Do not manually maintain a separate sitemap dataset.

It supports:

* category listing;
* search;
* filtering;
* entity opening.

Because it is data-driven, every valid public entity automatically becomes discoverable.

⸻

29. SEARCH

MVP search does not necessarily require a search server.

For a relatively small universe database, a generated client-side search index is sufficient.

Indexable fields:

* localized names;
* aliases;
* descriptions;
* tags;
* entity types;
* possibly related entity names.

Search should understand both RU and ENG datasets regardless of currently selected language where practical.

Example:

Searching:

Фомальгаут

and:

Fomalhaut

should resolve the same entity.

⸻

30. ASTRONAVIGATION INTEGRATION BOUNDARY

Stellar Attractor must not depend directly on Local Bubble internal implementation details throughout the application.

Define an integration boundary.

Conceptual API:

interface AstronavAdapter {
  mount(container: HTMLElement, options: AstronavOptions): void;
  destroy(): void;
  focusEntity(id: string): void;
  setLayer(id: string, enabled: boolean): void;
  setLocale(locale: "ru" | "en"): void;
  getState(): AstronavState;
  setState(state: AstronavState): void;
}

Whether the underlying implementation is eventually:

* imported package;
* shared component;
* iframe/embed;
* microfrontend;

should not affect the rest of Stellar Attractor.

⸻

31. STELLAR ATTRACTOR ASTRONAV LAYER

The fictional layer should be represented separately from scientific data.

Conceptual structure:

stellar-attractor-layer/
├── facilities
├── fictional-worlds
├── routes
├── vessels
├── events
└── annotations

Example record:

{
  "id": "station.base32",
  "type": "facility",
  "position": {
    "system": "tau-ceti"
  },
  "entity": "station.base32"
}

Precise coordinate representation should follow the coordinate system already used by Local Bubble.

Do not invent a second spatial coordinate model unless required.

⸻

32. LAYER RENDERING

The Stellar Attractor layer must visually distinguish itself from scientific data.

This can be accomplished through:

* marker shape;
* line style;
* HUD annotations;
* iconography;
* labels;
* layer state.

It should not require altering scientific source data.

Example layer controls:

REAL SPACE
COMMONWEALTH
OUTPOSTS
EXPEDITIONS
EVENTS
VESSELS

⸻

33. ASTRONAV DEEP LINKS

Astronavigation should accept direct navigation instructions.

Example:

/location/fomalhaut

can cause:

open Astronav
enable required layers
focus Fomalhaut
open entity panel

Likewise a Personnel relation can invoke:

navigate("/location/fomalhaut");

rather than implementing a special Personnel → Astronav connection.

Routing remains the integration mechanism.

⸻

34. MOBILE ARCHITECTURE

Mobile should not attempt to reproduce desktop spatial navigation literally.

Use the same:

* entities;
* routes;
* localization;
* data;
* system components.

Use a different shell.

Concept:

DesktopShell
    └── Cockpit
MobileShell
    └── RemoteTerminal

Both mount the same system views.

Example:

DesktopShell → PersonnelSystem
MobileShell  → PersonnelSystem

Only surrounding navigation changes.

⸻

35. RESPONSIVE BREAKPOINT STRATEGY

Do not build a large collection of device-specific layouts.

Prefer three behavioral categories:

mobile
compact desktop/tablet
full cockpit

The exact breakpoints should be determined from actual interface behavior rather than conventional device names.

⸻

36. PERFORMANCE BUDGET

The main risk is media weight rather than application JavaScript.

Priorities:

1. Fast initial shell.
2. Fast cockpit poster.
3. Lazy system loading.
4. Lazy video.
5. Lazy Astronav.
6. No unnecessary 3D libraries.

The initial cockpit must not require Local Bubble to initialize.

Concept:

LOAD APPLICATION
      ↓
COCKPIT INTERACTIVE
      ↓
user selects Astronav
      ↓
LOAD ASTRONAV MODULE

This boundary is important.

⸻

37. CODE SPLITTING

Major systems should be independently loadable.

Concept:

core
cockpit
personnel
fleet
base32
database
missions
astronav

Astronav will probably be the heaviest bundle and should remain outside the initial application path.

⸻

38. VIDEO PERFORMANCE

Living previews should:

* use short loops;
* use muted playback;
* avoid autoplay before user intent where unnecessary;
* use poster images;
* be unloaded or paused when not visible;
* use appropriately sized encodes.

A page containing 20 locations must not simultaneously decode 20 videos.

⸻

39. ACCESSIBILITY

Immersion must not remove normal web accessibility.

Every spatial hotspot must have an equivalent semantic control.

Important requirements:

* keyboard navigation;
* focus states;
* accessible labels;
* sufficient contrast;
* reduced-motion mode;
* conventional navigation through Database Index;
* meaningful alt text;
* no information available exclusively through hover.

The visual cockpit may be unconventional.

The underlying interaction model should not be.

⸻

40. SEO / INDEXABILITY

Entity pages must expose meaningful document content independently of visual immersion.

Search engines should be able to understand:

* entity name;
* description;
* relationships;
* media metadata;
* language.

Do not make all content exist only inside a client-side cockpit state.

Direct entity routes are therefore both an architectural and SEO requirement.

⸻

41. ANALYTICS

Analytics should measure actual exploration rather than only page views.

Useful events:

cockpit_pan
system_open
entity_open
relation_follow
astronav_focus
database_search
language_change
living_preview_play
restricted_record_view

Avoid excessive event granularity during MVP.

Primary questions:

* Which systems are actually used?
* Do users discover content through spatial navigation?
* How often is Database Index used instead?
* Which entities attract exploration?
* Does Astronav drive cross-navigation?
* Do users interact with living previews?

⸻

42. ERROR HANDLING

Errors should preserve the in-universe presentation where reasonable.

Examples:

Instead of:

404

presentation may say:

RECORD NOT FOUND

But HTTP behavior should remain correct.

Likewise:

ASTRONAVIGATION SYSTEM UNAVAILABLE

may be shown if the map module fails.

The user must always retain access to Database Index/navigation.

⸻

43. CONTENT AUTHORING WORKFLOW

MVP authoring flow:

Create/edit entity file
        ↓
Add media
        ↓
Run validation
        ↓
Build search index
        ↓
Build site
        ↓
Deploy

This workflow is particularly suitable for development with coding agents.

A future administration UI may automate it, but should not be required for launch.

⸻

44. REPOSITORY STRUCTURE

Conceptual structure:

stellar-attractor/
│
├── app/
│   ├── cockpit/
│   ├── astronav/
│   ├── fleet/
│   ├── personnel/
│   ├── base32/
│   ├── database/
│   └── missions/
│
├── components/
│   ├── hud/
│   ├── media/
│   ├── entities/
│   └── navigation/
│
├── core/
│   ├── router/
│   ├── entities/
│   ├── localization/
│   ├── search/
│   └── state/
│
├── data/
│   ├── people/
│   ├── vessels/
│   ├── stations/
│   ├── locations/
│   ├── missions/
│   └── events/
│
├── public/
│   └── media/
│
└── schemas/

Exact structure should follow the selected framework’s conventions where appropriate.

Do not preserve this conceptual layout if doing so fights the framework unnecessarily.

⸻

45. MVP IMPLEMENTATION PHASES

Phase 0 — Technical spike

Goal: prove the difficult interaction assumptions before building content.

Build:

* one oversized cockpit image;
* draggable viewport;
* camera bounds;
* one hotspot;
* automatic focus;
* return to overview;
* responsive scaling.

No final graphics required.

Success condition:

The cockpit interaction feels natural in a real browser.

⸻

Phase 1 — Application core

Implement:

* routing;
* entity resolver;
* localization;
* basic state;
* entity schema;
* validation;
* direct URLs.

Create several representative entities only.

Recommended test set:

* Zane;
* Illar Arden;
* Base #32;
* Stellar Nomad;
* Fomalhaut;
* Exodus.

This set is sufficient to test relationships between all major entity classes.

⸻

Phase 2 — Visual system

Implement:

* typography;
* colors;
* HUD variables;
* SVG frame library;
* buttons;
* panels;
* alerts;
* terminal transitions;
* animation conventions.

Do not build each screen with independent CSS.

The goal is to create the visual grammar first.

⸻

Phase 3 — Cockpit MVP

Replace technical spike assets with production graphics.

Implement:

* panoramic scene;
* main terminals;
* hotspots;
* first-use drag hint;
* navigation arrows;
* camera focus;
* system transitions;
* RUS/ENG;
* mobile fallback shell.

At the end of this phase the site should already feel like Stellar Attractor even if most terminals contain placeholder data.

⸻

Phase 4 — Database Index + Personnel

Build these first because they validate the entity architecture without complex graphics.

Implement:

* global entity listing;
* search;
* filters;
* Personnel browser;
* direct person routes;
* relations;
* restricted states.

This phase proves that immersive navigation and conventional navigation can coexist.

⸻

Phase 5 — Fleet Database

Implement:

* vessel index;
* canonical hero images;
* specifications;
* classification;
* schematic view;
* SVG hotspots;
* mission imagery;
* related records.

No 3D.

⸻

Phase 6 — Base #32

Implement:

* station overview;
* section hotspots;
* location information;
* related personnel;
* related missions;
* WebP previews;
* optional WebM living previews.

Start with only the sections for which useful material already exists.

⸻

Phase 7 — Astronavigation integration

Only after the rest of the application architecture is stable:

* implement AstronavAdapter;
* embed/reuse Local Bubble;
* synchronize locale;
* support focus requests;
* implement Stellar Attractor layer;
* implement entity links;
* lazy-load Astronav.

Do not begin by rewriting Local Bubble visual rendering.

Use the existing renderer first.

⸻

Phase 8 — Media and polish

Add:

* living previews;
* ambient animation;
* telemetry;
* boot sequence;
* transitions;
* loading states;
* error states;
* performance optimization.

This phase creates the final impression of a living system.

⸻

46. PARALLEL WORKSTREAMS

Several tasks can proceed independently.

Workstream A — Main website

Cockpit, entities, routing, systems.

Workstream B — Visual assets

Cockpit art, Base #32 views, vessel images, interiors.

Workstream C — HUD

Reusable SVG components and animation.

Workstream D — Local Bubble

Stellar Attractor overlay and eventual cinematic rendering mode.

Workstream E — Content

Entity conversion, RU/EN text, relationships and media metadata.

This parallelism is important because Local Bubble or media production should not block the core website.

⸻

47. MVP DEPENDENCY GRAPH

ENTITY MODEL ───────────────┐
                            │
ROUTING ────────────────────┼──► PERSONNEL
                            │
LOCALIZATION ───────────────┤
                            ├──► FLEET
HUD SYSTEM ──────┐          │
                 ├──► COCKPIT
MEDIA ───────────┘          │
                            ├──► BASE #32
SEARCH ◄──── ENTITY MODEL ──┤
                            │
                            └──► DATABASE INDEX
LOCAL BUBBLE
     │
     ├──► ASTRONAV ADAPTER
     │
SA LAYER
     │
     └──► ASTRONAV

Astronav is deliberately positioned as a branch rather than a prerequisite for the rest of the application.

⸻

48. IMPLEMENTATION PRIORITY

Priority should be determined by architectural risk, not visual attractiveness.

Recommended order:

Cockpit technical spike

→ Entity model

→ Routing/localization

→ HUD system

→ Production cockpit

→ Database Index

→ Personnel

→ Fleet

→ Base #32

→ Astronav

→ Living media

→ Polish

The first thing implemented should therefore not be the most beautiful page.

It should be the interaction that could invalidate the entire navigation concept if it does not work.

That interaction is the panoramic cockpit.

⸻

49. MAJOR RISKS

Risk 1 — Overengineering immersion

The project gradually becomes a browser game engine.

Mitigation:

Prefer DOM, CSS and SVG.

Do not introduce real-time 3D without a concrete requirement.

⸻

Risk 2 — Media explosion

Every new entity begins requiring custom videos and multiple new renders.

Mitigation:

Media enhancement is optional.

Every entity must work with one canonical image.

⸻

Risk 3 — Local Bubble coupling

Stellar Attractor becomes dependent on undocumented Local Bubble internals.

Mitigation:

AstronavAdapter boundary.

⸻

Risk 4 — Navigation confusion

Users do not understand the cockpit interaction.

Mitigation:

* explicit initial hint;
* arrows;
* automatic focus;
* Database Index;
* direct links.

⸻

Risk 5 — HUD inconsistency

Every system gradually develops a different visual language.

Mitigation:

Build the HUD component library before building many systems.

⸻

Risk 6 — Content duplication

Person, mission and location data are copied into several views.

Mitigation:

Single entity source plus relations.

⸻

Risk 7 — Premature CMS

Significant effort is spent building editing infrastructure before content volume requires it.

Mitigation:

Repository-managed data first.

⸻

Risk 8 — Premature 3D

Fleet Database consumes disproportionate development and content-production resources.

Mitigation:

2D-only MVP with a future renderer boundary.

⸻

50. MVP ACCEPTANCE CRITERIA

The MVP is successful when a new visitor can:

1. Enter Base #32.
2. Understand that the cockpit can be explored.
3. Move around the cockpit.
4. Open a terminal.
5. Navigate to Personnel.
6. Open a character.
7. Follow a relation to another entity.
8. Open Fleet Database.
9. Explore Base #32.
10. Search the Database Index.
11. Open Astronavigation.
12. See Stellar Attractor information over the astronomical environment.
13. Switch between Russian and English without losing context.
14. Share a direct entity URL.
15. perform the core experience on mobile through Remote Terminal.

And, most importantly:

The visitor should perceive these interactions as accessing systems inside the Stellar Attractor Universe rather than navigating a collection of conventionally designed web pages.

⸻

51. FIRST ENGINEERING MILESTONE

Before production implementation begins, build one isolated prototype:

Cockpit Interaction Prototype

It contains only:

* oversized temporary cockpit image;
* desktop viewport;
* drag-to-pan;
* left/right controls;
* bounded movement;
* one Astronav hotspot;
* automatic camera focus;
* animated HUD expansion;
* RETURN action;
* mobile Remote Terminal fallback.

No Local Bubble.

No database.

No final content.

No production artwork requirement.

This prototype answers the single most important early technical question:

Does navigating a website by physically looking around a spacecraft cockpit actually feel good?

If the answer is yes, the rest of the architecture can safely be built around it.

⸻

52. ARCHITECTURAL DECISION SUMMARY

For MVP:

2D > 3D

SVG > Canvas where practical

DOM > game engine

shared data > duplicated pages

direct URLs > application-only state

repository data > premature CMS

existing media > new asset requirements

Local Bubble reuse > second astronomical engine

lazy loading > giant initial bundle

progressive enhancement > mandatory effects

immersive navigation + conventional fallback > immersion at any cost

The technical architecture should remain considerably simpler than the experience it creates.

That asymmetry is intentional.

The user should see a complex operating system belonging to Base #32.

The implementation underneath should remain a relatively conventional, maintainable web application.