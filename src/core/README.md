# src/core/

Shell-level services: `entities/` (entity + relation resolver), `i18n/` (locale
store, LocalizedText helpers), `search/` (MiniSearch client wrapper),
`navigation/` (route ↔ system map, deep-link → focus intent), `clearance/`
(guest / restricted presentation resolver). Implementation Plan §3, §7.
Built across Phase 1 (#17, #19) and Phase 4.
