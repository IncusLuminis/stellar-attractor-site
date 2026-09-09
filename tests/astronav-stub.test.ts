// @vitest-environment jsdom
/**
 * Astronav MVP stub + `AstronavAdapter` boundary (#21).
 *
 * Covers: interface shape; mount/destroy no-leak; focusEntity → state + DOM;
 * setLayer round-trip; setLocale changes text; getState/setState round-trip;
 * "focus intent → stub focusing state" via `focusIntentForEntity` (#19).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { focusIntentForEntity } from "../src/core/navigation";
import type { AstronavAdapter, AstronavState } from "../src/systems/astronav/adapter";
import { createAstronavAdapter, StubAstronavAdapter } from "../src/systems/astronav/stub";
import { astronavStateFromFocusIntent, defaultAstronavState } from "../src/systems/astronav/state";
import { mountAstronav } from "../src/systems/astronav/mount";

const FOMALHAUT = { type: "location" as const, id: "location.fomalhaut", slug: "fomalhaut" };

function host(): HTMLElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AstronavAdapter — interface shape (Implementation Plan §8 / Technical Architecture §30)", () => {
  it("the stub exposes exactly the interface methods", () => {
    const adapter: AstronavAdapter = createAstronavAdapter();
    for (const method of [
      "mount",
      "destroy",
      "focusEntity",
      "setLayer",
      "setLocale",
      "getState",
      "setState",
    ] as const) {
      expect(typeof adapter[method]).toBe("function");
    }
  });

  it("createAstronavAdapter returns a StubAstronavAdapter", () => {
    expect(createAstronavAdapter()).toBeInstanceOf(StubAstronavAdapter);
  });
});

describe("mount / destroy — leak-free lifecycle (#21 AC 7)", () => {
  it("mount renders the in-universe placeholder panel", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    const text = container.textContent ?? "";
    expect(text).toContain("ASTRONAVIGATION");
    expect(text).toContain("SYSTEM ONLINE");
    expect(text).toContain("LOCAL SPACE");
    expect(text).toContain("COMMONWEALTH OVERLAY");
    expect(text).toContain("[ PROTOTYPE MODULE ]");
  });

  it("destroy removes all DOM and detaches listeners", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    const button = container.querySelector<HTMLButtonElement>("[data-astronav-layer-toggle]");
    expect(button).not.toBeNull();
    const spy = vi.fn();
    adapter.setLayer = spy as unknown as AstronavAdapter["setLayer"];

    adapter.destroy();

    expect(container.childElementCount).toBe(0);
    // The detached button must no longer reach the adapter.
    button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("mount → destroy → mount again works with no residue", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});
    adapter.mount(container, {}); // defensive re-mount
    adapter.destroy();
    adapter.destroy(); // idempotent
    expect(container.childElementCount).toBe(0);

    adapter.mount(container, {});
    expect(container.querySelectorAll("[data-astronav-panel]")).toHaveLength(1);
  });
});

describe("focusEntity — state + DOM (#21; Technical Architecture §33)", () => {
  it("updates focusedEntityId and shows a FOCUSING line", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe("STANDING BY");

    adapter.focusEntity("location.fomalhaut");

    expect(adapter.getState().focusedEntityId).toBe("location.fomalhaut");
    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe(
      "FOCUSING FOMALHAUT",
    );
  });
});

describe("setLayer — round-trip (#21)", () => {
  it("tracks the layer in state and reflects it in the DOM", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    expect(adapter.getState().layers.commonwealth).toBe(true);

    adapter.setLayer("commonwealth", false);
    expect(adapter.getState().layers.commonwealth).toBe(false);

    const li = container.querySelector<HTMLElement>('[data-layer-id="commonwealth"]');
    expect(li?.dataset.enabled).toBe("false");
    expect(li?.textContent).toContain("OFF");

    adapter.setLayer("expeditions", true); // a new id
    expect(adapter.getState().layers.expeditions).toBe(true);
    expect(container.querySelector('[data-layer-id="expeditions"]')).not.toBeNull();
  });

  it("a layer toggle button drives the adapter (mount → interact loop)", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    const button = container.querySelector<HTMLButtonElement>(
      '[data-astronav-layer-toggle="local-space"]',
    )!;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(adapter.getState().layers["local-space"]).toBe(false);
  });
});

describe("setLocale — visible text change (#21 AC 6)", () => {
  it("switches the status line and layer state words to Russian", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});
    adapter.focusEntity("location.fomalhaut");

    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe(
      "FOCUSING FOMALHAUT",
    );

    adapter.setLocale("ru");

    const status = container.querySelector("[data-astronav-status]")?.textContent ?? "";
    expect(status).not.toBe("FOCUSING FOMALHAUT");
    expect(status).toContain("FOMALHAUT");
    expect(/[А-Яа-я]/.test(status)).toBe(true);
    expect(adapter.getState().locale).toBe("ru");
  });
});

describe("getState / setState — plain-object round-trip (#21 AC 6)", () => {
  it("round-trips an AstronavState and re-renders", () => {
    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, {});

    const next: AstronavState = {
      focusedEntityId: "location.fomalhaut",
      layers: { "local-space": false, commonwealth: true, events: true },
      locale: "en",
    };
    adapter.setState(next);

    expect(adapter.getState()).toEqual(next);
    // deep copy — mutating the returned state must not affect the adapter
    const snapshot = adapter.getState();
    snapshot.layers.commonwealth = false;
    snapshot.focusedEntityId = "x";
    expect(adapter.getState()).toEqual(next);

    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe(
      "FOCUSING FOMALHAUT",
    );
  });

  it("defaultAstronavState is a plain serializable object", () => {
    const s = defaultAstronavState();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s).toEqual({
      focusedEntityId: null,
      layers: { "local-space": true, commonwealth: true },
      locale: "en",
    });
  });
});

describe("focus intent → stub focusing state (#19 routing contract, end to end)", () => {
  it("astronavStateFromFocusIntent(focusIntentForEntity(fomalhaut)) focuses FOMALHAUT", () => {
    const intent = focusIntentForEntity(FOMALHAUT);
    expect(intent).toEqual({
      system: "astronav",
      entityId: "location.fomalhaut",
      action: "focus",
    });

    const state = astronavStateFromFocusIntent(intent, "en");
    expect(state.focusedEntityId).toBe("location.fomalhaut");

    const container = host();
    const adapter = createAstronavAdapter();
    adapter.mount(container, { initialState: state });

    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe(
      "FOCUSING FOMALHAUT",
    );
  });

  it("mountAstronav wires the deep-link intent into a focusing panel", () => {
    const container = host();
    const handle = mountAstronav(container, { focusIntent: focusIntentForEntity(FOMALHAUT) });

    expect(handle.adapter.getState().focusedEntityId).toBe("location.fomalhaut");
    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe(
      "FOCUSING FOMALHAUT",
    );

    handle.destroy();
    expect(container.childElementCount).toBe(0);
  });

  it("mountAstronav with no intent comes up STANDING BY", () => {
    const container = host();
    const handle = mountAstronav(container, {});
    expect(container.querySelector("[data-astronav-status]")?.textContent).toBe("STANDING BY");
    handle.destroy();
  });

  it("a non-spatial intent does not put the stub in a focusing state", () => {
    const state = astronavStateFromFocusIntent(
      { system: "personnel", entityId: "person.zane", action: "focus" },
      "en",
    );
    expect(state.focusedEntityId).toBeNull();
  });
});
