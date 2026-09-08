STELLAR ATTRACTOR UNIVERSE

Interactive Web Experience

Concept & Product Vision v0.1

Status: Concept
Project: Stellar Attractor Universe
Target: Web / Desktop / Mobile
Languages: Russian / English

⸻

1. PRODUCT IDEA

Stellar Attractor Universe is not a conventional website about a fictional universe.

The visitor enters that universe.

The website is presented as an operational information system of Base #32 and the Commonwealth Deep Space Exploration infrastructure. Navigation, content, archives, characters, spacecraft, astronomical objects and media are accessed through interfaces that exist inside the fictional world itself.

The visitor does not select “Characters” from a website menu.

The visitor accesses PERSONNEL DATABASE.

The visitor does not open a video gallery.

The visitor retrieves a MISSION RECORD.

The visitor does not browse a conventional sitemap.

The visitor accesses DATABASE INDEX.

The visitor does not open an astronomy page.

The visitor activates ASTRONAVIGATION.

The central design principle is:

You are not visiting the Stellar Attractor website.
You have access to Base #32.

⸻

2. EXPERIENCE PRINCIPLES

2.1 Diegetic interface

Whenever practical, interface elements must have an explanation inside the Stellar Attractor Universe.

Conventional web abstractions should be translated into in-universe concepts.

Examples:

* Home → Base #32 / Main Operations
* Characters → Personnel Database
* Spaceships → Fleet Database
* Sitemap → Database Index
* Videos → Mission Records / Media Archive
* News → Directorate Bulletins / Communications
* Astronomy → Astronavigation
* Articles → Science & Research
* Gallery → Mission Imagery / Archives
* Premium content → Restricted Records

This principle applies to terminology, visual design, navigation and transitions.

⸻

3. ENTRY EXPERIENCE

The default desktop entry point is an operational cockpit or command station connected to Base #32.

A short initial sequence may establish the context:

DDSE REMOTE ACCESS

CONNECTING...

BASE #32 CENTRAL INFORMATION SYSTEM

AUTHENTICATING...

GUEST CLEARANCE ACCEPTED

SYSTEMS ONLINE

The sequence must remain short and skippable.

Returning visitors should not be forced to watch the complete sequence repeatedly.

After initialization, the user enters the main panoramic interface.

⸻

4. MAIN OPERATIONS COCKPIT

The cockpit is the primary spatial navigation environment.

It is intentionally larger than the browser viewport.

The browser viewport behaves as a camera looking at part of a larger cockpit scene.

The user can:

* drag horizontally to look around;
* select visible terminals and objects;
* use navigation arrows;
* allow the system to automatically focus the camera on a selected terminal;
* return to the cockpit overview.

The interaction model is approximately:

OVERVIEW → SELECT SYSTEM → CAMERA FOCUS → SYSTEM INTERFACE → RETURN

The interface must communicate that the scene extends beyond the viewport.

Possible signals include:

* partially visible consoles at viewport edges;
* left/right navigation indicators;
* DRAG TO LOOK AROUND instruction on first visit;
* grab cursor;
* subtle initial camera movement;
* optional panorama position indicator.

Manual exploration must never be the only navigation method.

⸻

5. PRIMARY SYSTEMS

The initial information architecture consists of:

ASTRONAVIGATION

Interactive astronomical space.

Real astronomical data combined with an optional Stellar Attractor Universe overlay.

FLEET DATABASE

Commonwealth ships, stations, shuttles, probes and other vehicles.

PERSONNEL

Characters, biographies, assignments, service records and relationships.

BASE #32

Interactive directory and internal structure of Base #32.

MISSIONS

Episodes, expeditions, incidents and mission records.

Initially this may remain relatively small and expand with the project.

SCIENCE & RESEARCH

Scientific material connecting the fictional universe with real astronomy and astrophysics.

ARCHIVES

Documents, recordings, historical material, images and other records.

COMMUNICATIONS

Project updates represented as transmissions, bulletins and incoming messages.

DATABASE INDEX

A conventional global information index represented as an in-universe database system.

⸻

6. DATABASE INDEX

Immersive navigation must not make information difficult to find.

Therefore the system includes a direct database interface.

Example:

DATABASE INDEX

PEOPLE
VESSELS
LOCATIONS
MISSIONS
EVENTS
SCIENCE
MEDIA
DOCUMENTS

The Database Index provides:

* global search;
* category browsing;
* direct entity access;
* fallback navigation;
* accessibility-friendly navigation;
* conventional discovery for users who do not want to explore spatial interfaces.

It effectively performs the function of a sitemap and global search system without breaking immersion.

⸻

7. ENTITY-BASED CONTENT MODEL

The website should not be architected primarily as a collection of pages.

It should be architected as a collection of interconnected entities.

Initial entity classes:

Person

Vessel

Station

Location

AstronomicalObject

Mission

Event

Organization

Document

Media

ScientificRecord

Each entity receives a persistent identifier.

Examples:

person/zane

person/illar-arden

location/fomalhaut

station/base-32

vessel/stellar-nomad

mission/exodus

Entities can reference other entities.

Example:

Zane → served_at → Fomalhaut Outpost

Zane → participated_in → Exodus

Exodus → occurred_at → Fomalhaut

Exodus → destination → Base #32

Base #32 → supervised_by → Illar Arden

The different interfaces are therefore different views into the same underlying entity graph.

⸻

8. DIRECT ADDRESSING

Every significant entity should have a stable URL.

The URL must remain usable regardless of the interface from which the entity was discovered.

For example:

/person/zane

may be reached through:

* Personnel;
* Astronavigation;
* Mission Archive;
* Base #32;
* Database Search;
* an external shared URL.

The receiving interface may reconstruct the appropriate immersive context around that entity.

This makes the experience compatible with:

* search engines;
* social sharing;
* external references;
* bookmarks;
* conventional browser navigation.

Immersion must never require sacrificing addressability.

⸻

9. ASTRONAVIGATION

Astronavigation is one of the central systems of the experience.

The preferred architecture is reuse rather than duplication.

The existing Local Bubble / Local Cosmos astronomical environment should serve as the underlying astronomical engine wherever practical.

Stellar Attractor adds an optional fictional layer.

Conceptually:

REAL UNIVERSE

plus

STELLAR ATTRACTOR OVERLAY

The overlay may contain:

* Base #32;
* Commonwealth installations;
* discovered fictional planets;
* outposts;
* spacecraft;
* expedition routes;
* historical routes;
* mission locations;
* incidents;
* unknown objects;
* fictional annotations.

The real astronomical dataset and fictional overlay must remain logically separate.

⸻

10. LOCAL BUBBLE INTEGRATION

The goal is to reuse the existing Local Bubble implementation rather than maintain a separate astronomical engine for Stellar Attractor.

Possible conceptual modes:

SCIENCE MODE

Real astronomical information only.

COMMONWEALTH OVERLAY

Real astronomical space with Stellar Attractor Universe information.

The standalone Local Bubble site may keep the fictional layer disabled.

Inside Stellar Attractor, the layer may be enabled automatically.

The Astronavigation terminal can embed the same engine in a cockpit-specific interface.

The precise integration method remains TBD.

Possible implementations include:

* shared package;
* reusable application component;
* embedded viewer;
* shared renderer with different configuration.

Forking the astronomical engine should be avoided.

⸻

11. ASTRONAVIGATION VISUAL MODES

The existing scientific representation prioritizes data clarity.

Stellar Attractor may eventually require a second rendering mode optimized for atmosphere.

Potential modes:

SCIENTIFIC

* compact star markers;
* restrained visualization;
* data-first presentation;
* scientific readability.

ENHANCED VISUALIZATION

* deep black background;
* photometric-looking stars;
* spectral coloration;
* glow and halo;
* restrained bloom;
* enhanced nebula rendering;
* cinematic overlays.

Both modes must use the same underlying astronomical coordinates and datasets.

The enhanced renderer is not required for the initial website MVP and may be developed independently.

⸻

12. FLEET DATABASE

Fleet Database represents:

* exploration vessels;
* reconnaissance vessels;
* stations;
* shuttles;
* transports;
* probes;
* other Commonwealth equipment.

Existing Commonwealth ship classification should be reflected in the interface rather than inventing a separate website taxonomy. The current material already defines purpose classes, range/autonomy classes, size/crew classes and AI autonomy levels.

The MVP explicitly does not require interactive 3D models.

Initial vessel presentation may use:

VISUAL

Canonical cinematic image.

SCHEMATIC

Side/front/top technical representation with SVG overlays and interactive hotspots.

MISSION IMAGERY

Existing images and footage from published material.

The viewer architecture should permit a future 3D renderer without requiring redesign of Fleet Database.

⸻

13. BASE #32

Base #32 acts both as a fictional location and as an important navigation structure.

The Base #32 system may present a station overview containing areas such as:

* Command;
* Science Labs;
* Medical;
* Hangar;
* Docking;
* Crew Quarters;
* Engineering;
* Observation;
* Life Support;
* Storage;
* Recreation.

The final list must follow established canon.

The station overview can use:

* a station illustration;
* technical diagrams;
* SVG overlays;
* hotspots;
* section labels;
* contextual information panels.

Selecting a section exposes related entities and media.

Example:

MEDICAL

may connect to:

* Dr. Sophie Ouchet;
* Zane;
* medical records;
* scenes taking place there;
* related mission records.

Thus Base #32 becomes another spatial view into the same entity graph.

⸻

14. LIVING INTERIORS

Interior locations can use existing and newly generated cinematic material.

The preferred lightweight interaction is:

STATIC WEBP → USER FOCUS/HOVER → SHORT WEBM

Short clips may depict slow camera movement through:

* Command;
* Medical;
* Hangar;
* Laboratories;
* Crew areas;
* Observation rooms;
* other environments.

Loops can be created using reversible camera movement where appropriate.

These clips provide the impression that the station exists beyond static interface imagery without requiring real-time 3D rendering.

On mobile devices, motion should be reduced or activated explicitly to control bandwidth and performance.

⸻

15. PERSONNEL

Personnel is backed by the existing character and biography material.

The interface represents a DDSE/Commonwealth personnel system rather than conventional character cards.

Potential data:

* portrait;
* name;
* rank;
* role;
* current assignment;
* biography;
* service history;
* related missions;
* related locations;
* associated vessels;
* documents;
* media;
* relationships.

Certain fields or records may display restricted access status.

⸻

16. MISSION ARCHIVE

Mission Archive connects events, locations, people and media.

The initial amount of mission content does not justify building an excessively complex archive.

The MVP may therefore begin with a relatively simple mission-record interface.

As the universe grows, it may evolve into:

* chronological timeline;
* expedition browser;
* incident database;
* episode archive;
* mission map;
* historical playback.

The data architecture should support this future expansion without requiring the complete interface at launch.

⸻

17. ACCESS LEVELS

Access control is part of the fictional presentation.

Potential levels:

GUEST

CIVILIAN

AUTHORIZED

RESTRICTED

CLASSIFIED

At MVP stage these levels may be primarily narrative and visual.

Example:

RECORD EXISTS

ACCESS LEVEL: RESTRICTED

CLEARANCE REQUIRED

The system should permit real authorization or paid access to be connected later.

This creates a natural future path for memberships or premium material without inserting conventional advertising or ecommerce UI into the fictional environment.

Monetization implementation is outside the initial MVP.

⸻

18. VISUAL SYSTEM

The entire website requires one coherent visual language.

Primary characteristics:

* dark spacecraft interiors;
* deep-space backgrounds;
* restrained blue/cyan interface light;
* limited warm/orange hardware lighting;
* technical typography;
* thin HUD geometry;
* translucent information layers;
* subtle animation;
* cinematic imagery;
* high contrast;
* dense but structured technical information.

The experience should resemble a functioning spacecraft information system rather than a decorative “sci-fi website”.

⸻

19. SVG / HUD SYSTEM

Reusable SVG HUD components should form a visual component library.

Potential elements:

* frames;
* brackets;
* corner markers;
* reticles;
* radar sweeps;
* status indicators;
* targeting markers;
* progress lines;
* telemetry;
* coordinate systems;
* separators;
* scanning effects;
* alert indicators.

They should be implemented as reusable components/styles rather than individually recreated for every page.

Animation should remain restrained.

A useful guideline is:

At any moment, most of the interface is stable; a small part of it is alive.

⸻

20. AMBIENT BEHAVIOR

The system should feel operational even when the user is not actively interacting with it.

Possible ambient effects:

* slow radar sweeps;
* occasional status changes;
* telemetry movement;
* subtle SVG scans;
* indicator blinking;
* very slow starfield parallax;
* distant vessel movement;
* background system messages;
* minor display refreshes.

Ambient animation must never compete with the content.

The objective is presence, not spectacle.

⸻

21. MEDIA STRATEGY

The project already contains substantial visual material.

The website should exploit existing assets before requiring new production.

Preferred formats:

WebP / AVIF

Static imagery and thumbnails.

WebM

Short ambient video and living previews.

SVG

HUD, diagrams, annotations and scalable technical interfaces.

Existing video

Mission records, episodes, diaries and other published material.

Real-time 3D should not be required where existing media can create an equivalent experience more cheaply.

⸻

22. LANGUAGE SYSTEM

Russian and English are first-class languages.

Language support must be architectural rather than implemented as post-production translation.

Entities should conceptually support localized fields:

name.ru

name.en

description.ru

description.en

The language selector is global:

RUS / ENG

Changing language should not change the selected entity, spatial position or application state.

⸻

23. MOBILE EXPERIENCE

The desktop cockpit cannot simply be scaled down to phone dimensions.

Mobile should be treated as another in-universe device.

Concept:

BASE #32 REMOTE TERMINAL

It exposes the same information architecture through a compact vertical interface.

Desktop:

physical cockpit / panoramic environment

Mobile:

portable Commonwealth terminal

This preserves immersion while allowing a genuinely responsive implementation.

⸻

24. PERFORMANCE PRINCIPLE

Immersion must not make the website slow.

Heavy assets should be loaded only when necessary.

Potential strategy:

* lightweight initial cockpit image;
* lazy-loaded WebM;
* lazy-loaded system modules;
* optimized SVG;
* static preview before interactive map initialization;
* reduced animation on low-performance devices;
* respect for prefers-reduced-motion.

The initial experience should become interactive quickly.

⸻

25. MVP

The proposed MVP includes:

1. Base #32 panoramic cockpit.
2. Pan / focus navigation.
3. Primary terminal hotspots.
4. Reusable SVG/HUD visual system.
5. RU / ENG localization.
6. Personnel Database.
7. 2D Fleet Database.
8. Base #32 Station Directory.
9. Database Index.
10. Global search.
11. Stable entity URLs.
12. Entity relationships.
13. Local Bubble integration or embedded Astronavigation.
14. Initial Stellar Attractor astronomical overlay.
15. Basic Mission Records.
16. Static imagery and optional WebM living previews.
17. Mobile Remote Terminal.
18. Guest/restricted presentation.

⸻

26. NON-GOALS FOR MVP

The following are explicitly not required for the first release:

* 3D spacecraft models;
* WebGL spacecraft viewer;
* fully populated Mission Archive;
* game backend;
* achievements;
* inventory;
* player characters;
* complex persistent user state;
* multiplayer functionality;
* complex user accounts;
* paid membership implementation;
* full cinematic redesign of Local Bubble;
* duplicated astronomical engine;
* large-scale procedural content generation.

These features may be introduced later without redefining the core product.

⸻

27. POST-MVP POSSIBILITIES

Possible future extensions include:

Cinematic Local Bubble renderer

Enhanced visualization mode for Astronavigation.

Interactive 3D vessels

If reliable and economical model-generation tools become available.

Persistent clearance

User accounts with access levels.

Paid Restricted Archives

Premium records integrated into the fictional clearance system.

Persistent discoveries

Remembering objects, documents or locations previously explored by a visitor.

Dynamic communications

New transmissions appearing as content is released.

Narrative events

Temporary changes to Base #32 corresponding to new episodes.

Game-like systems

Optional progression, discoveries or achievements.

These should be evaluated only after the core experience is operational.

⸻

28. TECHNICAL TBD

The following questions intentionally remain unresolved at the Product Vision stage:

Cockpit renderer

Exact implementation of panoramic movement, responsive scaling and camera focus.

Local Bubble integration

Package, component, embed or other shared architecture.

Stellar Attractor overlay

Data format and integration with the astronomical renderer.

Content storage

CMS, repository data, database or hybrid approach.

Entity graph

Storage and query mechanism for relationships.

Search

Client-side versus server-side implementation.

SVG/HUD library

Component structure and animation architecture.

Media delivery

CDN, caching and responsive media strategy.

Authentication

Future implementation of persistent clearance levels.

These belong in the Technical Architecture document.

⸻

29. DESIGN RULE

When choosing between two implementations, prefer the one that:

1. reuses existing Stellar Attractor assets;
2. reuses existing Incus Luminis technology;
3. preserves immersion;
4. remains addressable by normal URLs;
5. works without real-time 3D;
6. keeps content independent from presentation;
7. allows later expansion without rebuilding the site.

The website should not become another content-production project.

It should become the interface through which the existing and future Stellar Attractor Universe can be explored.

⸻

30. PRODUCT STATEMENT

Stellar Attractor Universe is an interactive gateway into a living science-fiction universe built around Base #32.

Real astronomical space, fictional history, characters, spacecraft, scientific material, missions and media are presented through a unified in-world information system.

The visitor is not shown the universe from outside.

The visitor is given access to it.