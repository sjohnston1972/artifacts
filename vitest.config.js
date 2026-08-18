import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tests/e2e holds Playwright specs (run via `npx playwright test`, not
    // vitest) — they import "@playwright/test", which vitest's default
    // "**/*.spec.js" match would otherwise pick up and fail to load.
    exclude: ["**/node_modules/**", "tests/e2e/**"],
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: { compatibilityDate: "2026-08-01" },
    }),
  ],
});
