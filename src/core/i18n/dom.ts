/**
 * Applying the active locale to a rendered page (#20 AC 4 & 6).
 *
 * Entity/route pages (#17, #19) prerender the DEFAULT locale's text as visible
 * content (SEO) and carry the other locale inline as data attributes:
 *
 *   <span data-i18n data-i18n-en="Base #32" data-i18n-ru="База №32">Base #32</span>
 *
 * `applyLocaleToDocument` sets `<html lang>` and swaps every `[data-i18n]`
 * element's text to the active locale. It touches text and the lang attribute
 * only — never app state, camera, scroll or selection (that is the whole point
 * of AC 6). No-op on the server (`document` undefined).
 */

import type { Locale } from "./types";

const DATASET_KEY: Record<Locale, "i18nEn" | "i18nRu"> = {
  en: "i18nEn",
  ru: "i18nRu",
};

export function applyLocaleToDocument(
  locale: Locale,
  doc: Document | undefined = typeof document !== "undefined" ? document : undefined,
): void {
  if (!doc) return;

  doc.documentElement.lang = locale;

  const key = DATASET_KEY[locale];
  const nodes = doc.querySelectorAll<HTMLElement>("[data-i18n]");
  for (const el of Array.from(nodes)) {
    const value = el.dataset[key];
    if (typeof value === "string") el.textContent = value;
  }
}
