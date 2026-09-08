# Phase 0 — Cockpit Interaction Prototype — Engineering Findings

**Status: PENDING human usability test per Cockpit Interaction Prototype
Specification §37.**

This note is the Phase 0 exit deliverable (Spec §40.4, Implementation Plan §11).
The four sections below are filled in **after** issue #13's usability test: at
least one person is given only *"Explore this interface and open Astronavigation"*
and observations 1–8 from Spec §37 are recorded. Until then this file is a
skeleton — the prototype and its automated checks are done, the human observation
is not.

Related: this Epic (#1) carries an **Integration checklist** for the Validator,
and a **human proceed / revise gate** must be recorded on #1 before any Phase 3+
cockpit-dependent Story is groomed (Implementation Plan §11, §13).

---

## Test scenario record (Spec §37)

> Give the prototype to a user and ask: *Explore this interface and open Astronavigation.*

| # | Observation | Result |
|---|---|---|
| 1 | Do they understand they can move? | _pending_ |
| 2 | Do they drag the cockpit? | _pending_ |
| 3 | Do they notice the Astronav terminal? | _pending_ |
| 4 | Does focus movement make sense? | _pending_ |
| 5 | Do they understand how to return? | _pending_ |
| 6 | Do they accidentally drag when trying to click? | _pending_ |
| 7 | Do they lose orientation? | _pending_ |
| 8 | Does animation feel too slow? | _pending_ |

Testers / hardware / browsers: _pending_

---

## What worked

_pending human usability test per Spec §37_

(Automated / developer-side status, for context — not a substitute for the test:
the look-around → focus → system overlay → return loop runs end to end on desktop;
the Mobile Remote Terminal renders as a distinct shell and opens the shared system
content; 35 unit tests pass covering bounds math at the four Spec §25 viewport
sizes, the click-vs-drag threshold, every state-machine transition, and resize
hardening; `npm run build` produces a working bundle with no runtime dependency.)

## What failed

_pending human usability test per Spec §37_

## What should change

_pending human usability test per Spec §37_

(Candidate items to evaluate against the observations: the astronav focus target
`x/y/scale` in `config/cockpit.json` is calibrated against placeholder art and
will need re-tuning for real Phase 3 artwork; the 760 px compact breakpoint is a
first guess per Implementation Plan §14; inertia is currently near-zero and may
want a touch more "weight"; the drag threshold is 5 px.)

## Recommendation: proceed / revise

_pending human usability test per Spec §37_

- [ ] **Proceed** — the spatial interaction is sound; groom Phases 1–8.
- [ ] **Revise** — specific changes required before the cockpit model is adopted:
      _…_

---

## Failure conditions to watch (Spec §39)

Reconsider the cockpit navigation model if the test shows any of:

- users consistently fail to discover drag;
- users frequently become spatially lost;
- focus transitions feel slower than normal navigation;
- responsive behaviour requires excessive special-casing;
- interaction performs poorly on common hardware;
- mobile/desktop architecture becomes tightly coupled;
- content readability needs zoom levels incompatible with cockpit navigation.
