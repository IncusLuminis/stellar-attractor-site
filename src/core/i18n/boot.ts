/**
 * Client locale boot (#20). Imported once as a module `<script>` from
 * `BaseLayout.astro`, so it runs on every page after hydration.
 *
 * 1. Resolve the preference: `?lang=` > stored > `en`.
 * 2. Apply it to the document (swap `[data-i18n]` text, set `<html lang>`).
 * 3. Keep the document in sync with any later `setLocale()` (the RUS/ENG island).
 *
 * Pages are prerendered in `en`; step 2 is a no-op paint-wise for `en` visitors
 * and a text-only swap for `ru` visitors — camera/scroll/selection untouched.
 */

import { initLocale } from "./store";
import { applyLocaleToDocument } from "./dom";
import { bindDocumentToLocale } from "./switch";

const locale = initLocale();
applyLocaleToDocument(locale);
bindDocumentToLocale();
