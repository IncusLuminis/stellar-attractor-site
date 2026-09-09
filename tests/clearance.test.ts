// @vitest-environment node
/**
 * Minimal clearance gate (#19; Technical Architecture §27). Presentation-only,
 * binary: guest-accessible levels render content, `restricted` / `classified`
 * render the locked state. Threshold decision documented in
 * `src/core/clearance/index.ts` and flagged in the #19 PR.
 */
import { describe, it, expect } from "vitest";

import {
  isGuestAccessible,
  isClearanceLocked,
  RESTRICTED_RECORD_LINES,
} from "../src/core/clearance";
import { CLEARANCE_LEVELS } from "../src/core/entities/schemas";

describe("isGuestAccessible", () => {
  it("undefined clearance renders content", () => {
    expect(isGuestAccessible(undefined)).toBe(true);
  });

  it("guest / civilian / authorized render content", () => {
    expect(isGuestAccessible("guest")).toBe(true);
    expect(isGuestAccessible("civilian")).toBe(true);
    expect(isGuestAccessible("authorized")).toBe(true);
  });

  it("restricted / classified render the locked state", () => {
    expect(isGuestAccessible("restricted")).toBe(false);
    expect(isGuestAccessible("classified")).toBe(false);
    expect(isClearanceLocked("restricted")).toBe(true);
  });

  it("covers every schema clearance level", () => {
    for (const level of CLEARANCE_LEVELS) {
      expect(typeof isGuestAccessible(level)).toBe("boolean");
    }
  });

  it("/person/zane (civilian) is not locked; mission.exodus (restricted) is", () => {
    // The #19 AC requires zane to render full content directly.
    expect(isClearanceLocked("civilian")).toBe(false);
    expect(isClearanceLocked("restricted")).toBe(true);
  });
});

describe("locked-state copy", () => {
  it("is the §27 / Product Vision §18 wording", () => {
    expect(RESTRICTED_RECORD_LINES).toEqual([
      "RECORD EXISTS",
      "ACCESS LEVEL: RESTRICTED",
      "CLEARANCE REQUIRED",
    ]);
  });
});
