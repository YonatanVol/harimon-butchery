import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the browser suite against a deployed shop: `LIVE_URL=https://… npx playwright test -c playwright.live.config.ts`.
 * Skips the specs that read the database directly (the tablet, review and reorder journeys), since those would be
 * reading this machine's database while the browser is on the deployed shop. The checkout specs place
 * real demo orders on that shop.
 */
const baseURL = process.env.LIVE_URL;
if (!baseURL) throw new Error("Set LIVE_URL to the deployed shop's address.");

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: /(staff-tablet|reviews|reorder)\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  outputDir: "test-results-live",
  reporter: [["list"]],
  use: { baseURL, timezoneId: "Asia/Jerusalem", channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "he-desktop", use: { viewport: { width: 1280, height: 800 }, locale: "he-IL" } },
    { name: "he-mobile", use: { ...devices["Pixel 7"], channel: "chrome", locale: "he-IL" }, testMatch: /(rtl-gate|checkout)\.spec\.ts/ },
    { name: "en-desktop", use: { viewport: { width: 1280, height: 800 }, locale: "en-IL" }, testMatch: /(rtl-gate|checkout)\.spec\.ts/ },
    { name: "iphone-15", use: { ...devices["iPhone 15"], browserName: "chromium", channel: "chrome", locale: "he-IL" }, testMatch: /rtl-gate\.spec\.ts/ },
    { name: "galaxy-s24", use: { ...devices["Galaxy S24"], channel: "chrome", locale: "he-IL" }, testMatch: /rtl-gate\.spec\.ts/ },
  ],
});
