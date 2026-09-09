// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { switchLocale, toggleLocale } from "../src/core/i18n/switch";
import { applyLocaleToDocument } from "../src/core/i18n/dom";
import { getLocale, initLocale, __resetLocaleStore } from "../src/core/i18n/store";

/** Mirrors Technical Architecture §6 AppState. */
interface MockAppState {
  locale: "ru" | "en";
  currentSystem: string;
  selectedEntityId?: string;
  cockpitCamera: { x: number; y: number; scale: number };
  scrollY: number;
}

beforeEach(() => {
  __resetLocaleStore();
  window.localStorage.clear();
  document.documentElement.lang = "en";
  document.body.innerHTML = `
    <h1 data-i18n data-i18n-en="Base #32" data-i18n-ru="База №32">Base #32</h1>
    <p data-i18n data-i18n-en="Orbital station" data-i18n-ru="Орбитальная станция">Orbital station</p>
    <span id="no-i18n">unchanged</span>
  `;
  initLocale({ search: "" });
});

describe("i18n — state-preserving switch (#20 AC 5 & 6)", () => {
  it("switchLocale() re-renders [data-i18n] text and sets <html lang>", () => {
    switchLocale("ru", undefined);
    expect(document.documentElement.lang).toBe("ru");
    expect(document.querySelector("h1")?.textContent).toBe("База №32");
    expect(document.querySelector("p")?.textContent).toBe("Орбитальная станция");
    expect(document.getElementById("no-i18n")?.textContent).toBe("unchanged");
  });

  it("switchLocale() returns the SAME app-state object, untouched", () => {
    const state: MockAppState = {
      locale: "en",
      currentSystem: "cockpit",
      selectedEntityId: "location.fomalhaut",
      cockpitCamera: { x: 120, y: -44, scale: 1.5 },
      scrollY: 800,
    };
    const snapshot = structuredClone(state);
    const cameraRef = state.cockpitCamera;

    const returned = switchLocale("ru", state);

    expect(returned).toBe(state); // same reference
    expect(state.cockpitCamera).toBe(cameraRef); // nested reference intact
    expect(state).toEqual(snapshot); // selectedEntityId, camera, scrollY, currentSystem unchanged
    expect(getLocale()).toBe("ru"); // only the store's locale moved
  });

  it("toggleLocale() flips locale and preserves state", () => {
    const state = { currentSystem: "astronav", selectedEntityId: "person.zane" };
    const snapshot = structuredClone(state);

    toggleLocale(state);
    expect(getLocale()).toBe("ru");
    toggleLocale(state);
    expect(getLocale()).toBe("en");
    expect(state).toEqual(snapshot);
  });

  it("switchLocale({ applyToDocument: false }) leaves the DOM text alone", () => {
    switchLocale("ru", undefined, { applyToDocument: false });
    expect(document.querySelector("h1")?.textContent).toBe("Base #32");
    expect(getLocale()).toBe("ru");
  });

  it("applyLocaleToDocument() is a no-op when passed no document", () => {
    expect(() => applyLocaleToDocument("ru", undefined)).not.toThrow();
  });
});
