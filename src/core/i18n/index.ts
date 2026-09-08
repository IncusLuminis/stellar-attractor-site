/**
 * `src/core/i18n` — LocalizedText helpers, locale resolution, the client locale
 * store, the state-preserving switch, and `hreflang` alternates (#20).
 *
 * See `./README.md` for the design (English default; `?lang=` > stored > `en`;
 * render-en / client-swap SSR strategy).
 */

export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_QUERY_PARAM,
  isLocale,
  otherLocale,
  type Locale,
  type LocalizedText,
} from "./types";

export { t, pick } from "./localized-text";

export {
  resolveLocale,
  parseLangParam,
  type LocaleResolution,
  type LocaleSource,
  type ResolveLocaleInput,
} from "./resolve";

export {
  getLocale,
  setLocale,
  subscribe,
  initLocale,
} from "./store";

export { applyLocaleToDocument } from "./dom";

export {
  switchLocale,
  toggleLocale,
  bindDocumentToLocale,
  type SwitchLocaleOptions,
} from "./switch";

export { buildHreflangAlternates, type HreflangAlternate } from "./hreflang";
