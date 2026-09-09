/**
 * `src/core/clearance/` — presentation-only clearance gate (Implementation Plan
 * §3 `core/clearance/`, §4; Technical Architecture §27).
 *
 * MINIMAL FIRST CUT (#19). This is deliberately not the full resolver the
 * Implementation Plan anticipates — there is no auth, no per-field masking, no
 * "unlock" flow. It answers one question the entity routes need now: does a
 * guest see this record's content, or the locked state?
 *
 *   guest-accessible  → render content
 *   restricted        → render "RECORD EXISTS / ACCESS LEVEL: RESTRICTED /
 *                        CLEARANCE REQUIRED"
 *
 * THRESHOLD DECISION (flagged for Product_Owner / a future clearance story):
 * §27 and Implementation Plan §4 describe a binary "guest-accessible vs
 * restricted" split but list five levels. #19 AC requires `/person/zane`
 * (`clearance: "civilian"`) to render full content, and `mission.exodus`
 * (`clearance: "restricted"`) is the locked example. So the line is drawn at
 * `restricted`:
 *
 *   undefined | guest | civilian | authorized  → content
 *   restricted | classified                    → locked
 *
 * The field and this mapping survive a real auth implementation unchanged.
 */

import { CLEARANCE_LEVELS, type Clearance } from "../entities/schemas";

/** Levels a guest may read in full. Everything else renders the locked state. */
export const GUEST_ACCESSIBLE_CLEARANCES: readonly Clearance[] = [
  "guest",
  "civilian",
  "authorized",
];

/** `true` when a guest sees this record's content; `false` → render the locked state. */
export function isGuestAccessible(clearance: Clearance | undefined): boolean {
  if (clearance === undefined) return true;
  return GUEST_ACCESSIBLE_CLEARANCES.includes(clearance);
}

/** Inverse of {@link isGuestAccessible} — reads better at some call sites. */
export function isClearanceLocked(clearance: Clearance | undefined): boolean {
  return !isGuestAccessible(clearance);
}

/** The locked-state copy (Technical Architecture §27; Product Vision §18). Not localized — in-universe system text. */
export const RESTRICTED_RECORD_LINES = [
  "RECORD EXISTS",
  "ACCESS LEVEL: RESTRICTED",
  "CLEARANCE REQUIRED",
] as const;

export { CLEARANCE_LEVELS, type Clearance };
