/**
 * i18n core types (#20, Implementation Plan §7.2, Technical Architecture §6 §13).
 *
 * One entity carries both languages (`LocalizedText` from the #16 schema); the
 * locale is a *presentation* preference, never a second data structure.
 * English is the default locale (human decision 2026-09-08) — SEO reach and
 * consistency with localbubble.space. Russian stays fully first-class.
 */

import type { LocalizedText } from "../entities/schemas";

export type { LocalizedText };

/** The two first-class locales. Order is canonical (drives the RUS/ENG control). */
export const LOCALES = ["en", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

/** Presentation default only — not a downgrade of RU content. */
export const DEFAULT_LOCALE: Locale = "en";

/** `localStorage` key holding the persisted locale preference. */
export const LOCALE_STORAGE_KEY = "sa:locale";

/** Query param that overrides the stored preference for shareable links. */
export const LOCALE_QUERY_PARAM = "lang";

/** Narrowing guard — anything not exactly `"en"` / `"ru"` is rejected. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The other locale — used by the RUS/ENG toggle. */
export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ru" : "en";
}
