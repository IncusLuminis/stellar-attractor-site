// @vitest-environment node
import { describe, it, expect } from "vitest";
import { t, pick } from "../src/core/i18n/localized-text";
import type { LocalizedText } from "../src/core/i18n/types";

const base32: LocalizedText = { ru: "База №32", en: "Base #32" };

describe("i18n — LocalizedText helpers (#20 AC 1)", () => {
  it("pick() returns the active locale's value verbatim", () => {
    expect(pick(base32, "en")).toBe("Base #32");
    expect(pick(base32, "ru")).toBe("База №32");
  });

  it("t() returns the active locale's value", () => {
    expect(t(base32, "en")).toBe("Base #32");
    expect(t(base32, "ru")).toBe("База №32");
  });

  it("t() falls back to the other locale when the active side is empty", () => {
    const partial = { ru: "", en: "Fomalhaut" } as LocalizedText;
    expect(t(partial, "ru")).toBe("Fomalhaut");
  });

  it("t() falls back to the provided default when neither side is usable", () => {
    const empty = { ru: "  ", en: "" } as LocalizedText;
    expect(t(empty, "en", "—")).toBe("—");
    expect(t(undefined, "en", "N/A")).toBe("N/A");
    expect(t(null, "ru")).toBe("");
  });
});
