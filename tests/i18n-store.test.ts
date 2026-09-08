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
});
