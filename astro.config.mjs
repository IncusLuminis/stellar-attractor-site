// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

// Stellar Attractor site — Astro application shell (Implementation Plan §2.1, §3).
//
// The Phase 0 cockpit spike ran on a bare Vite harness (root index.html +
// src/main.ts + vite.config.ts). That harness is folded in here: Astro owns
// Vite now, src/pages/index.astro is the entry point, and the reusable cockpit
// modules under src/cockpit/ are mounted as a client island.
//
// No deployment / domain / adapter config lives here by design
// (Implementation Plan §1 decision 7) — local `astro dev` / `astro preview` only.
export default defineConfig({
  // Static output — Astro ships zero JS by default; interactivity is opt-in
  // per island (Implementation Plan §2.1, Technical Architecture §37).
  output: "static",

  // Preact is wired purely to make the islands architecture usable
  // (`client:load` / `client:idle` / `client:visible`). The cockpit/HUD logic
  // itself stays framework-independent vanilla TS (Implementation Plan §2.2);
  // the Preact layer is a ~4 KB mount shim, not an application framework.
  integrations: [preact()],

  vite: {
    // Carried over from the Phase 0 vite.config.ts.
    build: {
      sourcemap: true,
    },
  },
});
