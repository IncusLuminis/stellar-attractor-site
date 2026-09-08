// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildHreflangAlternates } from "../src/core/i18n/hreflang";

describe("i18n — hreflang alternates (#20 AC 7)", () => {
  it("emits en, ru and x-default", () => {
    const alts = buildHreflangAlternates("https://stellar.test/location/fomalhaut");
    expect(alts.map((a) => a.hreflang)).toEqual(["en", "ru", "x-default"]);
  });

  it("en and x-default point at the clean URL; ru carries ?lang=ru", () => {
    const alts = buildHreflangAlternates("https://stellar.test/location/fomalhaut");
    const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
    expect(by.en).toBe("https://stellar.test/location/fomalhaut");
    expect(by["x-default"]).toBe("https://stellar.test/location/fomalhaut");
    expect(by.ru).toBe("https://stellar.test/location/fomalhaut?lang=ru");
  });

  it("strips a pre-existing lang param from all alternates", () => {
    const alts = buildHreflangAlternates("https://stellar.test/person/zane?lang=ru");
    const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
    expect(by.en).toBe("https://stellar.test/person/zane");
    expect(by.ru).toBe("https://stellar.test/person/zane?lang=ru");
  });

  it("accepts a URL instance", () => {
    const alts = buildHreflangAlternates(new URL("https://stellar.test/"));
    expect(alts[0]).toEqual({ hreflang: "en", href: "https://stellar.test/" });
  });

  it("preserves unrelated query params", () => {
    const alts = buildHreflangAlternates("https://stellar.test/x?ref=nav&lang=en");
    const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
    expect(by.en).toBe("https://stellar.test/x?ref=nav");
    expect(by.ru).toBe("https://stellar.test/x?ref=nav&lang=ru");
  });
});
