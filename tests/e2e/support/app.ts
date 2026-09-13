import { expect, type Page, type TestInfo } from "@playwright/test";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import type heMessages from "../../../src/i18n/messages/he.json";
import { e2eDatabaseUrl } from "./env";

export type Lang = "he" | "en";
export const langOf = (info: TestInfo): Lang => (info.project.name.startsWith("en") ? "en" : "he");
type Messages = typeof heMessages;
const load = (lang: Lang) => JSON.parse(readFileSync(new URL(`../../../src/i18n/messages/${lang}.json`, import.meta.url), "utf8")) as Messages;
const cache: Partial<Record<Lang, Messages>> = {};
export const messages = (lang: Lang): Messages => (cache[lang] ??= load(lang));

/** Plain text of an ICU message with its {placeholders} and plural blocks removed — for "starts with" matching. */
export const lead = (message: string) => message.split("{")[0].trim();

let sql: postgres.Sql | null = null;
/** Direct reads of the end-to-end database, to find seeded orders by state — never used to fake UI outcomes. */
export function e2eDb() {
  sql ??= postgres(e2eDatabaseUrl(), { max: 2, onnotice: () => {} });
  return sql;
}

/** Console errors and uncaught exceptions on a page: a screen that throws is not a working screen. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource: the server responded with a status of 404/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** Signs a staff member in through the real PIN pad (demo PIN 1234). */
export async function staffLogin(page: Page, name: string, lang: Lang = "he") {
  await page.goto(`/${lang}/staff/login`);
  await page.getByRole("button", { name }).click();
  for (const d of "1234") await page.getByRole("button", { name: d, exact: true }).click();
  await page.waitForURL(new RegExp(`/${lang}/staff$`));
}

/** No sideways scrolling on the page body — the RTL gate's core rule. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
}
