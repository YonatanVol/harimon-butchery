import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, langOf, staffLogin, watchErrors } from "./support/app";

/**
 * The RTL gate: every screen, in every project (Hebrew desktop, Hebrew phone, English desktop), has the right
 * direction, one main heading, no sideways scroll, and no errors in the console.
 */

const PUBLIC = ["", "/c/beef", "/p/beef-fillet", "/p/entrecote", "/o/shabbat", "/cuts", "/recipes", "/recipes/grilled-entrecote", "/search?q=chicken", "/kashrut", "/cart", "/account", "/staff/login", "/no-such-page"];
const STAFF = ["/staff", "/staff/deliveries", "/staff/stock", "/staff/catalog", "/staff/zones", "/staff/messages", "/staff/reviews", "/staff/audit"];

for (const path of PUBLIC) {
  test(`public ${path || "/"}`, async ({ page }, info) => {
    const lang = langOf(info);
    const errors = watchErrors(page);
    const response = await page.goto(`/${lang}${path}`);
    expect(response?.status()).toBe(path === "/no-such-page" ? 404 : 200);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "he" ? "rtl" : "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
}

test("staff screens", async ({ page }, info) => {
  const lang = langOf(info);
  const errors = watchErrors(page);
  await staffLogin(page, lang === "he" ? "רונית בן דוד" : "Ronit Ben David", lang);
  for (const path of STAFF) {
    await test.step(path, async () => {
      await page.goto(`/${lang}${path}`);
      await expect(page.locator("html")).toHaveAttribute("dir", lang === "he" ? "rtl" : "ltr");
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
    });
  }
  expect(errors).toEqual([]);
});
