// @vitest-environment node
/**
 * Focus-intent contract (#19 AC 6) — the derivation #21 depends on.
 */
import { describe, it, expect } from "vitest";

import {
  focusIntentForRoute,
  focusIntentForEntity,
  isSpatialFocusIntent,
  isSpatialSystem,
  SPATIAL_SYSTEMS,
  type FocusIntent,
} from "../src/core/navigation";

describe("focusIntentForRoute", () => {
  it("derives a focus intent for a spatial entity route", () => {
    const intent = focusIntentForRoute("/location/fomalhaut");
    expect(intent).toEqual<FocusIntent>({
      system: "astronav",
      entityId: "location.fomalhaut",
      action: "focus",
    });
  });

  it("derives a focus intent for a non-spatial entity route too", () => {
    expect(focusIntentForRoute("/person/zane")).toEqual<FocusIntent>({
      system: "personnel",
      entityId: "person.zane",
      action: "focus",
    });
  });

  it("returns null for bare system routes, `/`, and non-routes", () => {
    expect(focusIntentForRoute("/personnel")).toBeNull();
    expect(focusIntentForRoute("/")).toBeNull();
    expect(focusIntentForRoute("/astronav")).toBeNull();
    expect(focusIntentForRoute("/nope/nope")).toBeNull();
  });

  it("accepts a full URL", () => {
    expect(focusIntentForRoute("https://stellar.test/mission/exodus?lang=ru")).toEqual({
      system: "missions",
      entityId: "mission.exodus",
      action: "focus",
    });
  });
});

describe("focusIntentForEntity", () => {
  it("always produces an intent", () => {
    expect(
      focusIntentForEntity({ type: "vessel", id: "vessel.stellar-nomad", slug: "stellar-nomad" }),
    ).toEqual({ system: "fleet", entityId: "vessel.stellar-nomad", action: "focus" });
  });
});

describe("spatial systems", () => {
  it("Astronav is the only spatial system in Phase 1", () => {
    expect(SPATIAL_SYSTEMS).toEqual(["astronav"]);
    expect(isSpatialSystem("astronav")).toBe(true);
    expect(isSpatialSystem("personnel")).toBe(false);
  });

  it("isSpatialFocusIntent reflects the target system", () => {
    expect(isSpatialFocusIntent(focusIntentForRoute("/location/fomalhaut")!)).toBe(true);
    expect(isSpatialFocusIntent(focusIntentForRoute("/person/zane")!)).toBe(false);
  });
});
