import { defineConfig } from "vite";

// Minimal throwaway harness for the Phase 0 spike (Implementation Plan §2.2).
// The reusable cockpit modules live under src/cockpit/ and import nothing
// framework- or app-specific; index.html + src/main.ts + src/style.css are
// the disposable shell.
export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: true,
  },
});
