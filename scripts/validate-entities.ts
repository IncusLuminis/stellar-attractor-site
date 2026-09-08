/**
 * Entity validation — schema + referential integrity over data/*.json
 * (Implementation Plan §4, §10; Technical Architecture §35).
 *
 * PLACEHOLDER. Wired into `npm run build` via the `prebuild` hook so Story #18
 * only has to fill in the body: schema validation, duplicate-slug detection,
 * dangling-relation detection, missing ru/en translations, bad media refs — and
 * a non-zero exit on any failure. For now it is a no-op that always succeeds so
 * the build pipeline shape exists.
 */

console.log(
  "[validate-entities] not implemented — placeholder for Story #18. " +
    "No entity data to validate yet; exiting 0.",
);

process.exit(0);
