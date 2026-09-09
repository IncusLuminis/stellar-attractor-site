/**
 * `LocalizedText` helpers (#20 AC 1, Implementation Plan §9).
 *
 * `t()` is the value most call sites want: give it a localized field and the
 * active locale, get a plain string back. `pick()` is the strict variant for
 * code that already knows the field is well-formed per the #16 schema (both
 * sides required, non-empty).
 */

import type { Locale, LocalizedText } from "./types";
import { otherLocale } from "./types";

/**
 * Strict accessor: return the active locale's value verbatim. Assumes the #16
 * `localizedTextSchema` invariant (both `ru` and `en` present and non-empty).
 */
export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

/**
 * Forgiving accessor with a defined fallback chain:
 *   active locale → the other locale → `fallback`.
 *
 * The #16 schema forbids an empty side, so the "other locale" hop should never
 * fire in practice — it exists so a partially-authored fixture or a hand-built
 * object degrades to *some* text instead of `""` / `undefined`.
 */
export function t(
  text: LocalizedText | null | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!text) return fallback;

  const primary = text[locale];
  if (typeof primary === "string" && primary.trim() !== "") return primary;

  const secondary = text[otherLocale(locale)];
  if (typeof secondary === "string" && secondary.trim() !== "") return secondary;

  return fallback;
}
