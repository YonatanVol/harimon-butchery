import { expect, type Page, test } from "@playwright/test";
import { expectNoHorizontalOverflow, lead, langOf, messages, type Lang, watchErrors } from "./support/app";

const CITY = { he: "תל אביב", en: "Tel Aviv" } as const;

/** Adds the fillet, sets a delivery city and holds the first free window. Returns once the cart can check out. */
async function cartReadyForCheckout(page: Page, lang: Lang) {
  const m = messages(lang);
  await page.goto(`/${lang}/p/beef-fillet`);
  await page.getByRole("button", { name: m.shop.product.addToCart }).click();
  await expect(page.getByText(m.shop.cart.added)).toBeVisible();

  await page.goto(`/${lang}/cart`);
  await page.getByPlaceholder(m.shop.cart.cityPlaceholder).fill(CITY[lang]);
  await page.getByRole("button", { name: m.shop.cart.cityCheck }).click();
  const tabs = page.getByRole("tablist", { name: m.shop.cart.slotTitle }).getByRole("tab");
  await expect(tabs.first()).toBeVisible();

  // The first day with a free window: today may be past its cut-off, Shabbat or a holiday.
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    await tabs.nth(i).click();
    const free = page.getByRole("tabpanel").locator("button:not([disabled])").first();
    if (await free.isVisible().catch(() => false)) {
      await free.click();
      await expect(page.getByText(m.shop.cart.slotHeld).first()).toBeVisible();
      return;
    }
  }
  throw new Error("no free delivery window in the seeded fortnight");
}

async function fillDetails(page: Page, lang: Lang) {
  const c = messages(lang).checkout;
  await page.getByLabel(c.firstName, { exact: true }).fill(lang === "he" ? "שרה" : "Sarah");
  await page.getByLabel(c.lastName, { exact: true }).fill(lang === "he" ? "כהן" : "Cohen");
  await page.getByLabel(c.phone, { exact: true }).fill("052-555-0101");
  await page.getByLabel(c.street, { exact: true }).fill(lang === "he" ? "רוטשילד" : "Rothschild");
  await page.getByLabel(c.houseNumber, { exact: true }).fill("22");
}

test("a weight order: hold on the card, approve on the gateway, tracking shows it confirmed", async ({ page }, info) => {
  const lang = langOf(info);
  const m = messages(lang);
  const errors = watchErrors(page);
  await cartReadyForCheckout(page, lang);

  await page.getByRole("link", { name: new RegExp(`^${lead(m.shop.cart.checkoutHold)}`) }).click();
  await page.waitForURL(`**/${lang}/checkout`);
  await fillDetails(page, lang);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: new RegExp(lead(m.checkout.submitHold)) }).click();

  await page.waitForURL(`**/${lang}/pay/demo/**`);
  await expect(page.getByText(m.pay.demoBanner)).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`^${m.pay.scenario.APPROVE}\\s+Visa`) }).click();

  await page.waitForURL(/\/orders\/\d{4}-\d{5}\?t=/);
  await expect(page.getByText(m.tracking.placedTitle)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.tracking.status.AUTHORIZED);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("a declined card returns to checkout with the reason, and the cart is still there", async ({ page }, info) => {
  const lang = langOf(info);
  const m = messages(lang);
  await cartReadyForCheckout(page, lang);
  await page.getByRole("link", { name: new RegExp(`^${lead(m.shop.cart.checkoutHold)}`) }).click();
  await fillDetails(page, lang);
  await page.getByRole("button", { name: new RegExp(lead(m.checkout.submitHold)) }).click();
  await page.waitForURL(`**/${lang}/pay/demo/**`);
  await page.getByRole("button", { name: new RegExp(`^${m.pay.scenario.DECLINE_INSUFFICIENT}`) }).click();

  await page.waitForURL(`**/${lang}/checkout?declined=**`);
  await expect(page.getByRole("alert").filter({ hasText: lead(m.checkout.declined.INSUFFICIENT_FUNDS) })).toBeVisible();
  await page.goto(`/${lang}/cart`);
  await expect(page.getByText(lang === "he" ? "פילה בקר" : "Beef fillet").first()).toBeVisible();
});

test("a city we don't serve says so and takes a phone number for when we do", async ({ page }, info) => {
  const lang = langOf(info);
  const m = messages(lang);
  await page.goto(`/${lang}/p/beef-fillet`);
  await page.getByRole("button", { name: m.shop.product.addToCart }).click();
  await expect(page.getByText(m.shop.cart.added)).toBeVisible();
  await page.goto(`/${lang}/cart`);
  const city = lang === "he" ? "נתניה" : "Netanya";
  await page.getByPlaceholder(m.shop.cart.cityPlaceholder).fill(city);
  await page.getByRole("button", { name: m.shop.cart.cityCheck }).click();
  await expect(page.getByText(m.shop.cart.notServedHelp)).toBeVisible();
  const phone = { "he-desktop": "054-777-1001", "he-mobile": "054-777-1002", "en-desktop": "054-777-1003" }[info.project.name] ?? "054-777-1009";
  await page.getByLabel(new RegExp(lead(m.shop.interest.areaTitle))).fill(phone);
  await page.getByRole("button", { name: m.shop.interest.submit }).click();
  // First run joins; a rerun on the same database is told the number is already on the list.
  await expect(page.getByRole("status").filter({ hasText: new RegExp(`${lead(m.shop.interest.areaJoined)}|${lead(m.shop.interest.areaAlready)}`) })).toBeVisible();
});
