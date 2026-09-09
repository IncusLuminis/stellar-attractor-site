/**
 * Global RUS / ENG control (#20 AC 5).
 *
 * FUNCTIONAL ONLY — no styling. Issue #26 (Phase 2 visual system) owns
 * appearance; this ships an unstyled, accessible toggle so the behaviour can be
 * placed and tested now. Mount it as an island from `BaseLayout` / a HUD slot:
 *
 *   import LocaleSwitch from "../core/i18n/LocaleSwitch";
 *   <LocaleSwitch client:idle />
 *
 * Clicking a button changes localized text only — it calls `switchLocale`,
 * which never touches app state, camera, scroll or selection.
 */

import { useEffect, useState } from "preact/hooks";
import { getLocale, subscribe } from "./store";
import { switchLocale } from "./switch";
import { LOCALES, type Locale } from "./types";

const LABEL: Record<Locale, string> = { ru: "RUS", en: "ENG" };

export default function LocaleSwitch() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => subscribe(setLocaleState), []);

  return (
    <div class="locale-switch" role="group" aria-label="Language / Язык">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          data-locale={l}
          aria-pressed={l === locale}
          onClick={() => switchLocale(l, undefined)}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
