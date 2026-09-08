import { describe, it, expect, vi } from "vitest";
import { CockpitStateMachine } from "../src/cockpit/state-machine";

describe("CockpitStateMachine (Spec §4)", () => {
  it("walks the full reference path BOOT -> OVERVIEW -> MANUAL_PAN -> OVERVIEW -> FOCUSING -> SYSTEM_ACTIVE -> RETURNING -> OVERVIEW", () => {
    const sm = new CockpitStateMachine();
    expect(sm.state).toBe("BOOT");

    expect(sm.send("READY")).toBe(true);
    expect(sm.state).toBe("OVERVIEW");

    expect(sm.send("DRAG_START")).toBe(true);
    expect(sm.state).toBe("MANUAL_PAN");
    expect(sm.send("DRAG_END")).toBe(true);
    expect(sm.state).toBe("OVERVIEW");

    expect(sm.send("FOCUS")).toBe(true);
    expect(sm.state).toBe("FOCUSING");
    expect(sm.send("TRANSITION_END")).toBe(true);
    expect(sm.state).toBe("SYSTEM_ACTIVE");

    expect(sm.send("RETURN")).toBe(true);
    expect(sm.state).toBe("RETURNING");
    expect(sm.send("TRANSITION_END")).toBe(true);
    expect(sm.state).toBe("OVERVIEW");
  });

  it("rejects ambiguous / invalid transitions without mutating state", () => {
    const sm = new CockpitStateMachine("FOCUSING");
    // No dragging while an automatic focus transition runs (Spec §4, §15).
    expect(sm.send("DRAG_START")).toBe(false);
    expect(sm.send("FOCUS")).toBe(false);
    expect(sm.send("RETURN")).toBe(false);
    expect(sm.state).toBe("FOCUSING");
  });

  it("cannot focus from MANUAL_PAN (must settle to OVERVIEW first)", () => {
    const sm = new CockpitStateMachine("MANUAL_PAN");
    expect(sm.send("FOCUS")).toBe(false);
    expect(sm.state).toBe("MANUAL_PAN");
  });

  it("exposes derived capability queries used for input locking", () => {
    const sm = new CockpitStateMachine("OVERVIEW");
    expect(sm.canManualPan()).toBe(true);
    expect(sm.canActivateHotspot()).toBe(true);
    expect(sm.isInputLocked()).toBe(false);

    sm.send("FOCUS");
    expect(sm.isInputLocked()).toBe(true);
    expect(sm.canManualPan()).toBe(false);
    expect(sm.canActivateHotspot()).toBe(false);
    expect(sm.canReturn()).toBe(false);

    sm.send("TRANSITION_END");
    expect(sm.state).toBe("SYSTEM_ACTIVE");
    expect(sm.canReturn()).toBe(true);
    expect(sm.isInputLocked()).toBe(false);
  });

  it("notifies onChange listeners with from/to/event and supports unsubscribe", () => {
    const sm = new CockpitStateMachine();
    const spy = vi.fn();
    const off = sm.onChange(spy);
    sm.send("READY");
    expect(spy).toHaveBeenCalledWith({ from: "BOOT", to: "OVERVIEW", event: "READY" });
    off();
    sm.send("FOCUS");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("peek is pure", () => {
    const sm = new CockpitStateMachine("OVERVIEW");
    expect(sm.peek("FOCUS")).toBe("FOCUSING");
    expect(sm.state).toBe("OVERVIEW");
    expect(sm.peek("RETURN")).toBeNull();
  });
});
