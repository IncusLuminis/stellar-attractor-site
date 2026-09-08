/**
 * Search-index build — emits public/search-index.json from entity names,
 * aliases, descriptions, tags and related-entity names across BOTH locales,
 * for the client-side MiniSearch index (Implementation Plan §5, §7.3;
 * Technical Architecture §29).
 *
 * PLACEHOLDER. Wired into `npm run build` via the `prebuild` hook so the
 * Phase 4 / Story #38 work only has to fill in the body. For now it is a no-op
 * that always succeeds so the build pipeline shape exists.
 */

console.log(
  "[build-search-index] not implemented — placeholder for Phase 4 / Story #38. " +
    "No entity data to index yet; exiting 0.",
);

process.exit(0);
