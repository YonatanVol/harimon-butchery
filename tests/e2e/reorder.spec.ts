import { expect, test } from "@playwright/test";
import { e2eDb, lead, messages } from "./support/app";

/**
 * "Order this again" from the account page: the cuts of a delivered order land in the cart, and the cart
 * then shows them at today's prices.
 */
test("a delivered order goes back into the cart in one tap", async ({ page }) => {
  const m = messages("he").shop;

  const [past] = await e2eDb()`
    select o.order_number, c.phone_e164 as phone, count(*)::int as lines
    from orders o
    join customer c on c.id = o.customer_id
    join order_line ol on ol.order_id = o.id
    where o.status = 'DELIVERED' and ol.status not in ('SHORT', 'CANCELLED', 'SUBSTITUTED')
    group by o.order_number, c.phone_e164
    order by o.order_number
    limit 1`;
  expect(past, "the seed has no delivered order").toBeTruthy();

  await page.goto("/he/account");
  await page.getByLabel(m.account.login.phone).fill(String(past.phone).replace(/^\+972/, "0"));
  await page.getByRole("button", { name: m.account.login.sendCode }).click();
  const demo = page.getByRole("status").filter({ hasText: m.account.login.demoCode });
  await expect(demo).toBeVisible();
  await page.getByLabel(m.account.login.code, { exact: true }).fill((await demo.textContent())!.match(/\d{6}/)![0]);

  const row = page.getByRole("listitem").filter({ hasText: String(past.order_number) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: m.reorder.cta }).click();

  await expect(row.getByRole("status")).toContainText(lead(m.reorder.added));

  await page.goto("/he/cart");
  const cartLines = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /.+/ }) });
  expect(await cartLines.count()).toBeGreaterThan(0);
});
