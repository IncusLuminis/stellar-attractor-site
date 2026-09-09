/**
 * `hreflang` alternates (#20 AC 7, Technical Architecture §40).
 *
 * The site is a single set of URLs carrying both languages; RU is selected with
 * `?lang=ru`. So the alternates for any page are:
 *
 *   hreflang="en"        → the clean URL (default locale)
 *   hreflang="ru"        → the same URL + ?lang=ru
 *   hreflang="x-default" → the clean URL (points at `en`, per AC)
 *
 * `BaseLayout.astro` calls `buildHreflangAlternates(Astro.url)` and emits one
 * `<link rel="alternate">` per entry. Absolute URLs require `site` in
 * `astro.config.mjs`, which is deliberately unset for now (Implementation Plan
 * §1 decision 7) — until then hrefs resolve against the dev/preview origin.
 * If #19 introduces prerendered `/ru/...` routes, revisit this mapping there.
 */

import { LOCALE_QUERY_PARAM, type Locale } from "./types";

export interface HreflangAlternate {
  hreflang: Locale | "x-default";
  href: string;
}

export function buildHreflangAlternates(url: URL | string): HreflangAlternate[] {
  const base = typeof url === "string" ? new URL(url, "http://localhost") : new URL(url);

  // Clean URL = default locale, no lang param.
  const clean = new URL(base);
  clean.searchParams.delete(LOCALE_QUERY_PARAM);
  const enHref = clean.toString();

  const ru = new URL(clean);
  ru.searchParams.set(LOCALE_QUERY_PARAM, "ru");

  return [
    { hreflang: "en", href: enHref },
    { hreflang: "ru", href: ru.toString() },
    { hreflang: "x-default", href: enHref },
  ];
}
