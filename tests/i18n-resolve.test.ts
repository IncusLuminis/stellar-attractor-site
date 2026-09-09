// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resolveLocale, parseLangParam } from "../src/core/i18n/resolve";

describe("i18n — locale resolution precedence (#20 AC 2 & 3)", () => {
  it("first visit: no ?lang=, no stored preference → default en", () => {
    const r = resolveLocale({ search: "", stored: null });
    expect(r).toEqual({ locale: "en", source: "default", shouldPersist: false });
  });

  it("stored preference beats the default", () => {
    const r = resolveLocale({ search: "", stored: "ru" });
    expect(r).toEqual({ locale: "ru", source: "stored", shouldPersist: false });
  });

  it("?lang=ru beats a stored 'en' preference — and asks to be persisted", () => {
    const r = resolveLocale({ search: "?lang=ru", stored: "en" });
    expect(r).toEqual({ locale: "ru", source: "query", shouldPersist: true });
  });

  it("?lang=en beats a stored 'ru' preference", () => {
    const r = resolveLocale({ search: "?lang=en", stored: "ru" });
    expect(r.locale).toBe("en");
    expect(r.source).toBe("query");
  });

  it("invalid ?lang= values are ignored — resolution falls through", () => {
    for (const bad of ["?lang=fr", "?lang=", "?lang=EN", "?lang=ru-RU", "?foo=bar"]) {
      const r = resolveLocale({ search: bad, stored: "ru" });
      expect(r, bad).toMatchObject({ locale: "ru", source: "stored" });
    }
    // …and all the way to the default when there is no stored value either
    expect(resolveLocale({ search: "?lang=fr", stored: null }).locale).toBe("en");
  });

  it("corrupt stored values are ignored", () => {
    expect(resolveLocale({ search: "", stored: "de" }).locale).toBe("en");
    expect(resolveLocale({ search: "", stored: "" }).locale).toBe("en");
  });

  it("accepts URLSearchParams and URL, not just a raw string", () => {
    expect(parseLangParam(new URLSearchParams({ lang: "ru" }))).toBe("ru");
    expect(parseLangParam(new URL("https://x.test/person/zane?lang=ru"))).toBe("ru");
    expect(parseLangParam("lang=en")).toBe("en");
    expect(parseLangParam(null)).toBeNull();
  });

  it("honours a custom fallback locale", () => {
    expect(resolveLocale({ search: "", stored: null, fallback: "ru" }).locale).toBe("ru");
  });
});
