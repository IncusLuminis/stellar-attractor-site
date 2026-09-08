// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { DesktopShell } from "../src/shells/desktop-shell";
import { config, FakeClock } from "./helpers";

function mountShell() {
  const clock = new FakeClock();
  const root = document.createElement("div");
  Object.defineProperty(root, "clientWidth", { value: 1920, configurable: true });
  Object.defineProperty(root, "clientHeight", { value: 1080, configurable: true });
  document.body.appendChild(root);
  const shell = new DesktopShell({
    root,
    config,
    prefersReducedMotion: () => false,
    scheduler: clock.scheduler,
  });
  return { shell, root, clock };
}

describe("DesktopShell — Escape returns to overview (Spec §20, §35; regression)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("Escape returns to overview when focus is on the RETURN button", async () => {
    const { shell, root, clock } = mountShell();

    // Open the Astronav system: activate the hotspot, run the focus tween.
    const hotspot = root.querySelector<SVGElement>(".hotspot-shape")!;
    expect(hotspot).toBeTruthy();
    hotspot.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    clock.advance(config.animation.focusMs + 50);

    expect(root.querySelector(".system-overlay")).toBeTruthy();
    expect((shell as unknown as { controller: { sm: { state: string } } }).controller.sm.state).toBe(
      "SYSTEM_ACTIVE",
    );
    const returnBtn = root.querySelector<HTMLButtonElement>(".system-overlay-return")!;
    expect(returnBtn).toBeTruthy();

    // Focus really is on the RETURN button (a sibling of the cockpit area) — this
    // is exactly the condition the scoped keydown listener could not see.
    returnBtn.focus();
    expect(document.activeElement).toBe(returnBtn);

    // Escape from the RETURN button must trigger the return.
    returnBtn.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    clock.advance(config.animation.returnMs + 50);
    await new Promise((r) => setTimeout(r, 400)); // overlay's own DOM-cleanup timer

    const sm = (shell as unknown as { controller: { sm: { state: string } } }).controller.sm;
    expect(sm.state).toBe("OVERVIEW");
    expect(root.querySelector(".system-overlay")).toBeNull();
    const scene = root.querySelector<HTMLElement>(".cockpit-scene")!;
    expect(scene.style.getPropertyValue("--camera-x")).toBe(`${config.camera.overview.x}px`);
  });

  it("Escape does nothing while at overview (no system active)", () => {
    const { root } = mountShell();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const scene = root.querySelector<HTMLElement>(".cockpit-scene")!;
    expect(scene.style.getPropertyValue("--camera-x")).toBe(`${config.camera.overview.x}px`);
  });

  it("Escape is not stolen from a focused text field", () => {
    const { root, clock } = mountShell();
    root.querySelector<SVGElement>(".hotspot-shape")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    clock.advance(config.animation.focusMs + 50);
    expect(root.querySelector(".system-overlay")).toBeTruthy();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );

    // Still open — the editable control kept Escape (Spec §20).
    expect(root.querySelector(".system-overlay")).toBeTruthy();
  });
});
