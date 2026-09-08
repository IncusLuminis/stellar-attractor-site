STELLAR ATTRACTOR

Cockpit Interaction Prototype Specification

Version 0.1

Status: Technical Spike
Scope: Desktop + Mobile fallback
Purpose: Validate the core navigation model before production implementation

⸻

1. GOAL

Build a minimal interactive prototype proving that a panoramic Base #32 cockpit can function as the main navigation surface of the Stellar Attractor website.

The prototype must answer one question:

Does navigating by physically looking around a large spacecraft cockpit feel natural, understandable and controllable in a browser?

The prototype is not a production page.

It should prioritize interaction quality over final graphics.

⸻

2. NON-GOALS

Do not implement:

* final production artwork;
* Local Bubble;
* Astronavigation content;
* real entity data;
* CMS;
* authentication;
* user accounts;
* search;
* Fleet Database;
* Personnel;
* WebM previews;
* 3D;
* game state;
* analytics backend;
* final mobile design.

Use placeholders where necessary.

⸻

3. REQUIRED EXPERIENCE

On desktop:

1. User opens the page.
2. A wide cockpit scene is visible.
3. The scene is larger than the browser viewport.
4. User understands that it can be moved horizontally.
5. User drags the scene left/right.
6. Movement stops at scene boundaries.
7. User sees several cockpit terminals.
8. One terminal represents ASTRONAVIGATION.
9. User clicks that terminal.
10. Camera smoothly moves and zooms toward it.
11. The terminal activates.
12. A HUD/system panel expands.
13. User presses RETURN.
14. Camera returns to the cockpit overview.

On mobile:

1. Do not reproduce the panoramic cockpit interaction.
2. Show a simple BASE #32 REMOTE TERMINAL.
3. Provide at least one ASTRONAVIGATION button.
4. Opening and returning must work.

⸻

4. REFERENCE INTERACTION MODEL

Desktop states:

BOOT
  ↓
OVERVIEW
  ↓
MANUAL PAN
  ↓
OVERVIEW
  ↓
FOCUSING
  ↓
SYSTEM ACTIVE
  ↓
RETURNING
  ↓
OVERVIEW

State transitions must be explicit.

Avoid ambiguous combinations such as dragging while an automatic focus transition is running.

⸻

5. PROTOTYPE LAYOUT

Use one root application container.

Conceptual structure:

CockpitPrototype
│
├── CockpitViewport
│   └── CockpitScene
│       ├── BackgroundLayer
│       ├── DecorativeHudLayer
│       ├── HotspotLayer
│       └── ForegroundLayer
│
├── NavigationHints
├── PanoramaControls
├── SystemOverlay
└── MobileRemoteTerminal

⸻

6. SCENE SIZE

Use a canonical scene size larger than a common desktop viewport.

Recommended test size:

3200 × 1600

The exact number is not important.

Important:

* the user must not see the entire scene at once on a normal desktop;
* at least one terminal must initially be partially outside the viewport;
* horizontal movement must be clearly useful.

⸻

7. VIEWPORT BEHAVIOR

The viewport is the visible browser area.

The scene moves behind it.

Use CSS transforms rather than scrolling the document horizontally.

Recommended implementation:

transform: translate3d(var(--camera-x), var(--camera-y), 0)
           scale(var(--camera-scale));

The cockpit should not create a normal horizontal browser scrollbar.

⸻

8. CAMERA MODEL

Maintain explicit camera state:

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

Recommended initial capabilities:

panBy(dx: number, dy: number): void
panTo(x: number, y: number): void
focus(target: CameraTarget): void
overview(): void

For MVP spike, vertical movement may be very limited or disabled.

Primary movement is horizontal.

⸻

9. CAMERA BOUNDS

The scene must never drift outside usable boundaries.

Calculate bounds from:

* scene dimensions;
* viewport dimensions;
* current scale.

Clamp camera coordinates.

Example concept:

cameraX = clamp(cameraX, minX, maxX);

Do not hardcode boundary values that only work for one viewport size.

Recalculate on resize.

⸻

10. DRAG INTERACTION

Use Pointer Events.

Required behavior:

pointerdown
  ↓
capture pointer
  ↓
drag
  ↓
update camera position
  ↓
pointerup
  ↓
release pointer

Support mouse and compatible touch/stylus input through the same implementation where practical.

Use:

cursor: grab;

during idle draggable state.

Use:

cursor: grabbing;

during drag.

⸻

11. DRAG THRESHOLD

A small pointer movement must not accidentally count as both drag and click.

Introduce a drag threshold.

Example:

3–6 CSS pixels

If movement exceeds threshold:

interaction = drag

Otherwise:

interaction = click

This is critical because terminals are clickable objects inside a draggable scene.

⸻

12. INERTIA

Optional for the first implementation.

Preferred behavior:

* small, restrained inertia after release;
* quick deceleration;
* soft boundary stop.

Do not implement long map-style kinetic movement.

The cockpit should feel heavy.

If inertia complicates the spike, omit it initially.

Drag quality is more important.

⸻

13. AUTOMATIC FOCUS

When a terminal is selected:

CURRENT CAMERA
      ↓
animate
      ↓
TARGET CAMERA

Target configuration:

interface CameraTarget {
  x: number;
  y: number;
  scale: number;
}

Example:

const cameraTargets = {
  overview: {
    x: 0,
    y: 0,
    scale: 1
  },
  astronav: {
    x: -900,
    y: -120,
    scale: 1.4
  }
};

Values are illustrative.

Actual targets must be calibrated against the prototype artwork.

⸻

14. CAMERA TRANSITION

Use smooth animation.

Recommended:

400–800 ms

Use easing with a controlled mechanical feel.

Avoid:

* excessive spring;
* bounce;
* overshoot;
* game-camera motion.

The UI should feel like an automated terminal focus system.

⸻

15. INPUT LOCK DURING TRANSITION

While FOCUSING or RETURNING:

* disable manual drag;
* ignore hotspot activation;
* keep RETURN disabled until valid.

This prevents conflicting camera instructions.

⸻

16. HOTSPOT LAYER

Use SVG for interactive geometry.

Example:

<svg
  viewBox="0 0 3200 1600"
  aria-label="Cockpit systems"
>
  <polygon
    data-system="astronav"
    points="..."
    tabindex="0"
    role="button"
    aria-label="Open Astronavigation"
  />
</svg>

The hotspot must align with the terminal at all responsive scales.

⸻

17. HOTSPOT VISUAL STATES

Required states:

idle
hover
focus
active
disabled

Idle may be invisible.

Hover/focus should reveal that the object is interactive.

Example visual treatment:

thin cyan outline
subtle translucent fill
small terminal label

Do not create a permanent glowing rectangle around every cockpit object.

⸻

18. ASTRONAVIGATION TERMINAL

Prototype only.

The terminal needs no real map.

When activated, show a placeholder interface such as:

ASTRONAVIGATION
SYSTEM ONLINE
LOCAL SPACE
COMMONWEALTH OVERLAY
[ PROTOTYPE MODULE ]

The purpose is to test focus and system activation.

⸻

19. SYSTEM OVERLAY

After camera focus completes:

1. terminal indicates activation;
2. SVG/HUD frame expands or fades in;
3. placeholder system content becomes visible.

Suggested structure:

SystemOverlay
├── Header
├── HudFrame
├── PlaceholderContent
└── ReturnControl

⸻

20. RETURN

Provide a visible in-world control:

RETURN

or:

BACK TO MAIN OPERATIONS

Also support:

Escape

on desktop.

Escape must not override text-field interaction if future controls are focused.

For this prototype there may be no editable controls.

⸻

21. FIRST-USE DISCOVERY

The user must understand that the cockpit can be moved.

Implement at least three signals:

A. Cropped content

Part of another console should remain visible near one viewport edge.

B. Initial instruction

Show:

DRAG TO LOOK AROUND

and localized equivalent if localization is included.

C. Pointer cursor

Use grab.

Optional fourth signal:

D. Small automatic nudge

After initial load, shift the cockpit approximately 20–30 px and return.

Do this once only.

Respect reduced-motion preference.

⸻

22. HINT DISMISSAL

The initial drag hint disappears after:

* first successful drag;
* explicit dismissal;
* or opening a terminal.

It must not continue obstructing the scene.

For the technical spike, persistence across browser sessions is not required.

⸻

23. PANORAMA CONTROLS

Provide left/right controls in addition to drag.

Example:

◀           ▶

Behavior:

* move camera by one sensible increment;
* respect bounds;
* animate movement;
* remain usable via keyboard.

This provides an accessible non-drag alternative.

⸻

24. OPTIONAL POSITION INDICATOR

Nice to have, not mandatory.

Example:

FULL SCENE
────────────────────────────
      ███████
      CURRENT VIEW

The indicator may reflect approximate viewport position within the cockpit.

Do not let this become a complex minimap.

⸻

25. RESPONSIVE DESKTOP

The scene should scale to preserve useful physical size.

Do not simply fit the entire 3200 px scene into the viewport.

Requirements:

* scene remains larger than viewport;
* primary terminals remain comfortably readable;
* camera bounds update on resize.

Test at minimum:

1920 × 1080
1440 × 900
1366 × 768
1024 × 768

⸻

26. MOBILE BREAKPOINT

At a chosen compact width, switch architecture.

Conceptual condition:

if (compactViewport) {
  renderRemoteTerminal();
} else {
  renderCockpit();
}

Do not merely hide pieces of the desktop cockpit until it fits.

⸻

27. MOBILE REMOTE TERMINAL

Minimum prototype:

BASE #32
REMOTE ACCESS
SYSTEMS
[ ASTRONAVIGATION ]
[ DATABASE ]
STATUS
CONNECTED
GUEST CLEARANCE

Clicking ASTRONAVIGATION opens the same placeholder system content without camera animation.

Return restores the Remote Terminal.

⸻

28. REDUCED MOTION

Support:

@media (prefers-reduced-motion: reduce)

In reduced-motion mode:

* disable initial nudge;
* greatly shorten or remove camera tween;
* disable decorative HUD animation.

The navigation must remain fully usable.

⸻

29. TEMPORARY ARTWORK

Do not spend production effort on prototype assets.

Acceptable:

* generated cockpit concept image;
* rough composited cockpit;
* placeholder terminal labels;
* simple SVG HUD.

The image only needs enough structure to test:

* viewport composition;
* drag;
* focus;
* hotspot discovery.

⸻

30. TECHNICAL CONSTRAINTS

Preferred:

* standard HTML;
* CSS transforms;
* SVG;
* Pointer Events;
* minimal JavaScript state.

Avoid for this spike:

* Three.js;
* PixiJS;
* Phaser;
* custom WebGL;
* physics libraries;
* animation frameworks unless already present in project stack.

A small dependency for tweening is acceptable only if the project already uses it.

⸻

31. PERFORMANCE TARGET

The prototype should feel immediate.

Targets:

* initial interaction available without loading optional system modules;
* drag updates should remain visually smooth;
* no layout work on every pointer event;
* camera movement should use transforms, not left/top.

Recommended:

pointer movement
      ↓
update camera state
      ↓
transform

Avoid reading layout repeatedly during drag.

⸻

32. COMPONENT BOUNDARIES

Recommended minimal components:

CockpitPrototype
CockpitViewport
CockpitScene
CockpitHotspots
NavigationHints
PanControls
SystemOverlay
RemoteTerminal

Do not over-componentize prototype-only code.

The camera controller should be separate enough to survive into production if successful.

⸻

33. CAMERA CONTROLLER RESPONSIBILITY

The camera controller owns:

* position;
* scale;
* bounds;
* drag state;
* transitions;
* focus targets.

It must not know:

* Personnel data;
* Astronav data;
* localization content;
* Fleet data.

Example conceptual boundary:

camera.focus("astronav");

not:

camera.openAstronavAndFetchFomalhautAnd...

⸻

34. SYSTEM ACTIVATION RESPONSIBILITY

Navigation layer owns selected system.

Example:

setActiveSystem("astronav");

Recommended flow:

hotspot click
     ↓
navigation request
     ↓
camera.focus()
     ↓
transition complete
     ↓
setActiveSystem()

This keeps camera mechanics independent from application content.

⸻

35. KEYBOARD

Desktop minimum:

Left Arrow   → pan left
Right Arrow  → pan right
Escape       → return to overview
Enter/Space  → activate focused hotspot

Keyboard handling should apply only while the cockpit interaction area is focused.

Do not globally hijack browser keys.

⸻

36. TOUCH

For tablet-sized cockpit mode, Pointer Events should permit drag.

Do not disable vertical page scrolling globally unless cockpit mode intentionally occupies the full interaction area.

Prefer horizontal intent detection where practical.

If this becomes awkward, tablet can use the Remote Terminal layout.

This decision may be based on prototype testing.

⸻

37. TEST SCENARIO

A successful usability test should require no explanation from the developer.

Give the prototype to a user and ask:

Explore this interface and open Astronavigation.

Observe:

1. Do they understand they can move?
2. Do they drag the cockpit?
3. Do they notice the Astronav terminal?
4. Does focus movement make sense?
5. Do they understand how to return?
6. Do they accidentally drag when trying to click?
7. Do they lose orientation?
8. Does animation feel too slow?

These observations are more valuable than visual polish during the spike.

⸻

38. ACCEPTANCE CRITERIA

The prototype passes if:

* cockpit is larger than viewport;
* drag works reliably;
* browser page does not horizontally scroll;
* camera is bounded;
* click and drag are correctly distinguished;
* arrows provide alternate navigation;
* Astronav hotspot works;
* automatic focus works;
* Return restores overview;
* resizing does not break bounds;
* mobile fallback works;
* reduced-motion mode works;
* no heavy graphics/runtime dependency is required.

⸻

39. FAILURE CONDITIONS

Reconsider the cockpit navigation model if tests show that:

* users consistently fail to discover drag;
* users frequently become spatially lost;
* focus transitions feel slower than normal navigation;
* responsive behavior requires excessive special cases;
* interaction performs poorly on common hardware;
* mobile/desktop architecture becomes tightly coupled;
* content readability requires zoom levels incompatible with cockpit navigation.

Failure of the prototype is acceptable.

The purpose of a technical spike is to invalidate bad assumptions cheaply.

⸻

40. DELIVERABLES

The spike should produce:

1. Working prototype

Desktop panoramic cockpit + mobile fallback.

2. Short README

Containing:

* how to run;
* interaction controls;
* architecture summary;
* known limitations.

3. Camera configuration

A standalone configuration containing:

scene size
overview position
astronav target
camera bounds
animation timing

4. Findings

A short engineering note:

What worked
What failed
What should change
Recommendation: proceed / revise

⸻

41. RECOMMENDED IMPLEMENTATION ORDER

Step 1

Render oversized static cockpit scene.

Step 2

Implement responsive camera bounds.

Step 3

Implement Pointer Event drag.

Step 4

Add click-vs-drag threshold.

Step 5

Add left/right controls.

Step 6

Add first-use hint.

Step 7

Add SVG Astronav hotspot.

Step 8

Implement camera focus transition.

Step 9

Implement SystemOverlay.

Step 10

Implement Return.

Step 11

Add keyboard support.

Step 12

Add reduced-motion behavior.

Step 13

Add Mobile Remote Terminal.

Step 14

Test resize and interaction edge cases.

⸻

42. EXPECTED RESULT

The completed prototype should look substantially simpler than the eventual Stellar Attractor website.

That is intentional.

Its value is proving the underlying spatial interaction:

LOOK AROUND
     ↓
DISCOVER SYSTEM
     ↓
FOCUS
     ↓
INTERACT
     ↓
RETURN

If this loop feels natural, it becomes the foundation for:

* Astronavigation;
* Personnel;
* Fleet;
* Base #32;
* Database Index;
* future systems.

No additional major implementation work should depend on panoramic cockpit navigation until this prototype has been tested successfully.