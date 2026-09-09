// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLocale,
  setLocale,
  subscribe,
  initLocale,
  __resetLocaleStore,
} from "../src/core/i18n/store";
import { LOCALE_STORAGE_KEY } from "../src/core/i18n/types";

beforeEach(() => {
  __resetLocaleStore();
  window.localStorage.clear();
});

describe("i18n — locale store (#20 AC 2 & 5)", () => {
  it("initLocale() defaults to en with no ?lang= and no stored preference", () => {
    expect(initLocale({ search: "" })).toBe("en");
    expect(getLocale()).toBe("en");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it("initLocale() adopts a stored preference without rewriting it", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "ru");
    expect(initLocale({ search: "" })).toBe("ru");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ru");
  });

  it("initLocale() persists a ?lang= override (shareable links)", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    expect(initLocale({ search: "?lang=ru" })).toBe("ru");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ru");
  });

  it("initLocale() is idempotent", () => {
    initLocale({ search: "?lang=ru" });
    expect(initLocale({ search: "?lang=en" })).toBe("ru");
  });

  it("setLocale() updates, persists and notifies subscribers", () => {
    initLocale({ search: "" });
    const seen: string[] = [];
    subscribe((l) => seen.push(l));

    setLocale("ru");
    expect(getLocale()).toBe("ru");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ru");
    expect(seen).toEqual(["ru"]);
  });

  it("setLocale() with { persist: false } does not write storage", () => {
    initLocale({ search: "" });
    setLocale("ru", { persist: false });
    expect(getLocale()).toBe("ru");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it("setLocale() ignores an unchanged or invalid value (no notification)", () => {
    initLocale({ search: "" });
    const listener = vi.fn();
    subscribe(listener);
    setLocale("en"); // unchanged
    // @ts-expect-error — invalid at runtime
    setLocale("fr");
    expect(listener).not.toHaveBeenCalled();
    expect(getLocale()).toBe("en");
  });

  it("subscribe() returns a working unsubscribe", () => {
    initLocale({ search: "" });
    const listener = vi.fn();
    const off = subscribe(listener);
    off();
    setLocale("ru");
    expect(listener).not.toHaveBeenCalled();
  });

  it("initLocale() reads window.location.search when no search option is given", () => {
    window.history.replaceState({}, "", "/person/zane?lang=ru");
    expect(initLocale()).toBe("ru");
    expect(getLocale()).toBe("ru");
  });

  it("survives localStorage throwing on read and write (private window)", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => initLocale({ search: "?lang=ru" })).not.toThrow();
    expect(getLocale()).toBe("ru"); // still honoured, just not persisted
    expect(() => setLocale("en")).not.toThrow();
    expect(getLocale()).toBe("en");

    getSpy.mockRestore();
    setSpy.mockRestore();
  });

  it("shares state across module instances (separate Vite chunks in the build)", async () => {
    // boot (inlined <head>) and a client island are different chunks: a plain
    // module-level `let` would give each its own store. Simulate with resetModules.
    vi.resetModules();
    const chunkA = await import("../src/core/i18n/store");
    chunkA.__resetLocaleStore();
    chunkA.initLocale({ search: "?lang=ru" });

    vi.resetModules();
    const chunkB = await import("../src/core/i18n/store");

    expect(chunkB.getLocale()).toBe("ru"); // B sees A's initLocale()

    const seenByB: string[] = [];
    chunkB.subscribe((l) => seenByB.push(l));
    chunkA.setLocale("en"); // set via A
    expect(chunkB.getLocale()).toBe("en"); // …observed by B
    expect(seenByB).toEqual(["en"]); // …and B's subscriber fired
  });
});
