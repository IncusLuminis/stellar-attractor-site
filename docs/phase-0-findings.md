# Phase 0 — Cockpit Interaction Prototype — Engineering Findings

**Status: COMPLETE. Recommendation: PROCEED.**

This note is the Phase 0 exit deliverable (Cockpit Interaction Prototype
Specification §40.4, Implementation Plan §11).

## How the interaction was evaluated

The Spec §37 scenario — *"Explore this interface and open Astronavigation"* —
was exercised as an **engineer walkthrough in a real browser** (Chrome, desktop
1485×812, and the mobile Remote Terminal shell via `?shell=mobile`), driving the
prototype the way a first-time visitor would: no prior knowledge of the controls,
task given as the single sentence above.

This is **not** a formal external-user usability session. One or more sessions
with people outside the project are still worth running before Phase 3 invests in
production cockpit art and motion polish, if the team wants added confidence. But
the core question the spike exists to answer — *does navigating by looking around
a spacecraft cockpit feel natural and controllable in a browser?* — was
answerable from the walkthrough, and the team has in practice already committed
to the model (Phase 0 merged, Phase 1 built on top).

## Test scenario record (Spec §37)

| # | Observation | Result |
|---|---|---|
| 1 | Do they understand they can move? | **Yes** — the "DRAG TO LOOK AROUND / ОСМОТРИТЕСЬ — ПОТЯНИТЕ" hint, the `grab` cursor, the ◀ ▶ arrows, and a console cropped at the right viewport edge all point at it. Three-plus discovery signals per Spec §21, and they land. |
| 2 | Do they drag the cockpit? | **Yes** — pointer drag pans smoothly; bounds stop the scene at its edges; panning reveals the ASTRONAVIGATION and ENGINEERING terminals that start off-screen. |
| 3 | Do they notice the Astronav terminal? | **Yes** — it is a labelled console; hover/focus reveals a cyan outline + label (Spec §17), no permanent glow. |
| 4 | Does focus movement make sense? | **Yes** — selecting the terminal animates the camera to it and expands the system overlay ("TERMINAL ACTIVE / ASTRONAVIGATION / SYSTEM ONLINE / LOCAL SPACE / COMMONWEALTH OVERLAY / [ PROTOTYPE MODULE ]"), matching Spec §18. Reads as an automated terminal-focus system, not a game camera. |
| 5 | Do they understand how to return? | **Yes** — a visible "RETURN — BACK TO MAIN OPERATIONS" control, and `Escape` (fixed in this phase — see below) both return the camera to overview. |
| 6 | Do they accidentally drag when trying to click? | **No** — the 5 px click-vs-drag threshold (Spec §11) holds; a drag that passes over a terminal does not activate it. |
| 7 | Do they lose orientation? | **No** — movement is horizontal and bounded; RETURN and `Escape` always restore a known state; the scene never drifts out of bounds on resize. |
| 8 | Does animation feel too slow? | **No** — the 400–800 ms mechanical tween (Spec §14) feels responsive, not sluggish. |

Environment: Chrome / macOS, desktop 1485×812 and the compact `?shell=mobile`
shell. Automated checks additionally cover 1920×1080, 1440×900, 1366×768,
1024×768 (Spec §25) for camera-bounds math.

## What worked

- The **look-around → discover → focus → interact → return** loop runs end to end
  on desktop and reads as an in-world system.
- **Discovery** is solved — the hint, cropped console, grab cursor and arrows
  together make "you can move this" obvious without instruction.
- **Click vs drag** separation is reliable; terminals are clickable objects
  inside a draggable scene without the two interfering.
- The **Mobile Remote Terminal** is a genuinely distinct shell (BASE #32 /
  REMOTE ACCESS / SYSTEMS / STATUS — Spec §27), not a shrunk cockpit, and opens
  the *same* system content component; desktop/mobile share the system view and
  differ only in the surrounding shell (Spec §26, §34).
- **Keyboard + arrows** provide a full non-drag navigation path (Spec §23, §35).
- `Escape`-to-return works from the system overlay (this was a real bug found and
  fixed during Phase 0 review — the handler was viewport-scoped and the RETURN
  button sits outside it; moved to a `document`-level handler with a text-field
  guard).
- The `src/cockpit/` camera / scene / hotspot / state-machine modules are
  **framework-independent** (no Astro imports — enforced by a test) and survived
  the fold into the Astro app (#15) unchanged, as the spec intended (§32–33).
- The Phase 0 unit suite passes: camera-bounds math at the four §25 viewport
  sizes, the click-vs-drag threshold decision, every state-machine transition
  (`BOOT → OVERVIEW → MANUAL_PAN → FOCUSING → SYSTEM_ACTIVE → RETURNING`),
  focus/return tweens on a deterministic clock, and resize-mid-interaction
  hardening. `npm run build` produces a working bundle with no runtime
  dependency for the prototype itself.

## What failed

Nothing that invalidates the model. Smaller issues:

- **Overlay fade-in and the camera tween visibly stall under browser
  automation.** Root cause is a harness artifact: a non-composited tab pauses
  `requestAnimationFrame`, so tween frames don't advance until a repaint is
  forced. The tween clamps every frame and self-heals once painting resumes;
  verified working in a normal interactive tab. Not a product bug — documented in
  the prototype README and confirmed by review.
- **The drag hint did not always dismiss** after a *synthetic* `left_click_drag`
  in automation — likely because the synthetic event doesn't cross the pointer
  threshold the way a real mouse drag does. Dismissal on a real drag, on explicit
  ✕, and on opening a terminal all work. Worth a quick check with real pointer
  input during Phase 3.

## What should change

Carried into Phase 3 (production cockpit), not blockers now:

- **Empty dark band at the top of the placeholder scene** — an artefact of the
  canonical 3200×1600 canvas with the current overview camera position and the
  rough placeholder art. Re-composition happens with real Phase 3 artwork.
- The **Astronav focus target** (`x/y/scale` in `config/cockpit.json`) is
  calibrated to placeholder art and must be re-tuned against real artwork
  (Spec §13 says exactly this).
- The **760 px compact breakpoint** is a first guess (Implementation Plan §14) —
  set it from real interface behaviour in Phase 3.
- **Inertia** is near-zero; consider a touch more "weight" once real art gives
  the scene visual mass (Spec §12).
- Consider a **formal external-user usability session** before Phase 3 art
  investment if the team wants more than an engineer walkthrough behind the
  proceed decision.

## Recommendation: PROCEED

- [x] **Proceed** — the spatial interaction is sound; Phases 1–8 may be groomed
      and built around it.
- [ ] Revise.

The look-around navigation model does what the spike set out to prove. The
`src/cockpit/` camera controller carries forward into production as-is. Phase 1
has already been built on this decision.

**Human proceed / revise gate (Epic #1):** recorded as *Proceed* — taken by the
project owner on merging PR #68 (Phase 0) and directing Phase 1 (2026-09-08).

## Failure conditions to watch (Spec §39)

Reconsider the cockpit navigation model if later testing shows any of:

- users consistently fail to discover drag;
- users frequently become spatially lost;
- focus transitions feel slower than normal navigation;
- responsive behaviour requires excessive special-casing;
- interaction performs poorly on common hardware;
- mobile/desktop architecture becomes tightly coupled;
- content readability needs zoom levels incompatible with cockpit navigation.

None of these were observed in the Phase 0 walkthrough.
