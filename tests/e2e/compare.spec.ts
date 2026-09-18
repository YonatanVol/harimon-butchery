import { expect, test } from "@playwright/test";
import { messages } from "./support/app";

/**
 * Two cuts side by side. The choice lives in the address, so a comparison can be sent to someone;
 * a cut that does not exist is ignored rather than breaking the page.
 */
test("puts two cuts side by side, and keeps the choice in the address", async ({ page }) => {
  const m = messages("he").shop.compare;

  await page.goto("/he/compare");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.title);
  await expect(page.getByText(m.empty)).toBeVisible();

  await page.getByLabel(m.slot.replace("{n}", "1")).selectOption("entrecote");
  await expect(page).toHaveURL(/cuts=entrecote/);
  await page.getByLabel(m.slot.replace("{n}", "2")).selectOption("beef-fillet");
  await expect(page).toHaveURL(/cuts=entrecote%2Cbeef-fillet|cuts=entrecote,beef-fillet/);

  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader", { name: "אנטריקוט" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "פילה בקר" })).toBeVisible();

  // The row that makes the comparison worth doing: what one helping costs.
  const perServing = table.getByRole("row").filter({ hasText: m.perServing });
  await expect(perServing).toBeVisible();
  const amounts = await perServing.locator("bdi").allInnerTexts();
  expect(amounts).toHaveLength(2);
  for (const amount of amounts) expect(amount).toMatch(/\d/);
});

test("ignores a cut that does not exist instead of breaking", async ({ page }) => {
  const m = messages("he").shop.compare;
  const response = await page.goto("/he/compare?cuts=entrecote,not-a-cut,entrecote");
  expect(response?.status()).toBe(200);

  // One real cut, once — the repeat and the invention are both dropped.
  await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(1);
  await expect(page.getByText(m.empty)).toHaveCount(0);
});
