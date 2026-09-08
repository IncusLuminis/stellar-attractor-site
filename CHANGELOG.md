# Changelog

This project follows Keep a Changelog.

## [Unreleased]

### Added

- Phase 0 Cockpit Interaction Prototype spike (Epic #1, Stories #2–#12): oversized
  panoramic cockpit scene with placeholder art; framework-independent
  `src/cockpit/` modules (camera controller with explicit state machine,
  responsive bounds, pointer drag + click-vs-drag threshold, SVG Astronav
  hotspot, first-use discovery, panorama arrows + keyboard, automatic focus
  transition + input lock); shared `SystemOverlay` / Mobile `RemoteTerminal`
  fallback; reduced-motion support; resize hardening.
- Minimal Vite + TypeScript + Vitest harness; 35 unit tests for camera bounds,
  drag threshold and state-machine transitions.
- Standalone camera configuration `config/cockpit.json` (+ JSON Schema).
- `README.md` (run / controls / architecture / limitations) and
  `docs/phase-0-findings.md` skeleton (pending the Spec §37 usability test).

### Changed

- `README.md` replaced the repo template stub with the Phase 0 prototype guide.

### Fixed

-