import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT, e2eDatabaseUrl } from "./tests/e2e/support/env";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const DATABASE_URL = e2eDatabaseUrl();

export default defineConfig({
  testDir: "tests/e2e",
  // One shop, one database: specs run in order so they don't book the same windows at once.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    timezoneId: "Asia/Jerusalem",
    // The installed Google Chrome: no separate browser download needed to run the suite.
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx tsx scripts/e2e-prepare.ts && npx next build && npx next start -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/he`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      ...(process.env as Record<string, string>),
      DATABASE_URL,
      NEXT_DIST_DIR: ".next-e2e",
      APP_URL: `http://localhost:${E2E_PORT}`,
      PAYMENT_PROVIDER: "MOCK",
      NOTIFICATIONS_PROVIDER: "MOCK",
    },
  },
  projects: [
    { name: "he-desktop", use: { viewport: { width: 1280, height: 800 }, locale: "he-IL" }, testIgnore: /staff-tablet/ },
    { name: "he-mobile", use: { ...devices["Pixel 7"], channel: "chrome", locale: "he-IL" }, testMatch: /(rtl-gate|checkout)\.spec\.ts/ },
    // Phone sizes and user agents; both run in Chrome here (no WebKit download), so Safari-only quirks aren't covered.
    { name: "iphone-15", use: { ...devices["iPhone 15"], browserName: "chromium", channel: "chrome", locale: "he-IL" }, testMatch: /rtl-gate\.spec\.ts/ },
    { name: "galaxy-s24", use: { ...devices["Galaxy S24"], channel: "chrome", locale: "he-IL" }, testMatch: /rtl-gate\.spec\.ts/ },
    { name: "he-tablet-pack", use: { viewport: { width: 1180, height: 820 }, hasTouch: true, locale: "he-IL" }, testMatch: /staff-tablet\.spec\.ts/ },
    { name: "en-desktop", use: { viewport: { width: 1280, height: 800 }, locale: "en-IL" }, testMatch: /(rtl-gate|checkout)\.spec\.ts/ },
  ],
});
