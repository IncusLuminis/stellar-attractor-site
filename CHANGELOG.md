# Changelog

This project follows Keep a Changelog.

## [Unreleased]

### Added

- Phase 1 Astro project skeleton (Epic #14, Story #15): Astro application shell
  with `@astrojs/preact` for islands; strict TypeScript
  (`astro/tsconfigs/strict`); `astro dev` / `build` / `preview` / `astro check`
  scripts; `prebuild` hook wiring placeholder `scripts/validate-entities.ts`
  (#18) and `scripts/build-search-index.ts` (Phase 4 / #38); repo layout per
  Implementation Plan §3 (`src/pages`, `src/layouts`, `src/systems`, `src/hud`,
  `src/core`, `src/media`, `src/content`, `data/`, `schemas/`); `src/pages/index.astro`
  mounting the Phase 0 cockpit as a `client:idle` island; a plain
  `placeholder.astro` content route (zero JS); design tokens re-exported from
  `shared/style/` unforked via `src/styles/tokens.css`;
  `tests/cockpit-framework-independence.test.ts` enforcing that `src/cockpit/`
  has no framework imports.
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

- The Phase 0 Vite harness is folded into Astro: root `index.html` → `src/pages/index.astro`,
  `src/main.ts` → `src/cockpit-mount.ts` (exported `mountCockpit`), `vite.config.ts`
  → `astro.config.mjs`, `src/style.css` → `src/styles/cockpit.css` (local token
  block dropped in favour of the shared tokens). `src/cockpit/`, `src/shells/`,
  `src/system/`, `config/` and `tests/` are unchanged.
- `README.md` replaced the repo template stub with the Phase 0 prototype guide.
- `README.md` rewritten for the Phase 1 Astro app (run, islands architecture,
  code-splitting boundaries, layout, known limitations).

### Fixed

-