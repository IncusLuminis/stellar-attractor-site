# src/systems/

One folder per primary system (astronav/, fleet/, personnel/, base32/, missions/,
database/) per Implementation Plan §3. Astronavigation is a **stub** for the MVP
(§8). Populated from Phase 1 (#19, Astronav stub) and Phase 2+.

The Phase 0 shared SystemOverlay / SystemContent currently live in `src/system/`
(singular) — that is the reusable overlay component, not a per-system folder, and
moves under `src/components/` when the visual system lands (Phase 2).
