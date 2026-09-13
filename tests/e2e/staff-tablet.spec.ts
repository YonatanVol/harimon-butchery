import { expect, test } from "@playwright/test";
import { e2eDb, lead, messages, staffLogin, watchErrors } from "./support/app";

const he = messages("he");
const p = he.staff.pack;

test("weigh an order on the tablet, ask the customer about an overweight cut, and charge after they approve", async ({ page, browser }) => {
  const sql = e2eDb();
  // An authorized order whose first weight line can go over the range.
  const [order] = await sql<{ id: string; order_number: string; access_token: string }[]>`
    select o.id, o.order_number, o.access_token from orders o
    where o.status = 'AUTHORIZED' and exists (select 1 from order_line l where l.order_id = o.id and l.pricing_mode = 'WEIGHT')
    order by o.order_number limit 1`;
  expect(order, "seed has an authorized weight order").toBeTruthy();
  const lines = await sql<{ product_name_he: string; pricing_mode: string; estimated_g: number | null; tolerance_max_g: number | null; handling_flags: string[] }[]>`
    select product_name_he, pricing_mode, estimated_g, tolerance_max_g, handling_flags from order_line where order_id = ${order.id} order by sort_order`;

  const errors = watchErrors(page);
  await staffLogin(page, "אבי שטרן");
  await page.goto(`/he/staff/pack/${order.id}?start=1`);
  const list = page.getByRole("list").first();
  await expect(page.getByText(`${he.staff.pack.status.PENDING}`).first()).toBeVisible();

  let asked = false;
  for (const line of lines) {
    await page.getByRole("button", { name: new RegExp(line.product_name_he.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    if (line.pricing_mode === "PACKAGE") {
      await page.getByRole("button", { name: new RegExp(`^${lead(p.packagePicked)}`) }).click();
      continue;
    }
    if (!asked) {
      // 20% over the top of the range: the confirm button refuses, and the three honest options appear.
      const over = Math.round((line.tolerance_max_g! * 1.2) / 10) * 10;
      await page.keyboard.type(String(over));
      await expect(page.getByRole("button", { name: p.confirmOver })).toBeDisabled();
      await page.getByRole("button", { name: p.overAsk }).click();
      await expect(page.getByText(new RegExp(lead(p.waitingTitle))).first()).toBeVisible();
      asked = true;

      // The customer, on their phone, keeps the whole cut.
      const customer = await browser.newPage();
      await customer.goto(`/he/orders/${order.order_number}?t=${order.access_token}`);
      await customer.getByRole("button", { name: new RegExp(`^${lead(he.tracking.actions.approveExtra)}`) }).click();
      await expect(customer.getByRole("heading", { level: 1 })).toHaveText(he.tracking.status.PICKING);
      await customer.close();

      // The tablet notices on its own (it checks every 10 seconds).
      await expect(page.getByText(new RegExp(lead(p.waitingTitle)))).toHaveCount(0, { timeout: 25_000 });
      continue;
    }
    await page.keyboard.type(String(line.estimated_g));
    await page.getByRole("button", { name: new RegExp(`^${lead(p.confirm)}`) }).click();
    if (line.handling_flags.includes("REQUIRES_BROILING_TZLIYA")) await page.getByLabel(new RegExp(p.handlingLiver)).check();
    if (line.handling_flags.includes("REQUIRES_SALTING")) await page.getByLabel(new RegExp(p.handlingSalting)).check();
  }

  await page.getByRole("button", { name: p.finish, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${lead(p.finishCharge)}`) }).click();
  await expect(page.getByText(new RegExp(`^${lead(p.capturedTitle)}`))).toBeVisible();
  await page.getByRole("button", { name: p.markPacked }).click();
  await expect(page.getByText(p.packedDone)).toBeVisible();
  expect(list).toBeTruthy();
  expect(errors).toEqual([]);
});

test("driver marks nobody home; the manager returns it to the shop and refunds part of it", async ({ browser }) => {
  const sql = e2eDb();
  const [order] = await sql<{ id: string; order_number: string; service_date: string; captured_agorot: number }[]>`
    select o.id, o.order_number, s.service_date::text, o.captured_agorot from orders o join delivery_slot s on s.id = o.slot_id
    where o.status = 'OUT_FOR_DELIVERY' order by o.order_number limit 1`;
  expect(order, "seed has an order out for delivery").toBeTruthy();

  const driver = await browser.newPage();
  await staffLogin(driver, "דניאל חדד");
  await driver.goto(`/he/staff/deliveries?date=${order.service_date}`);
  const card = driver.getByRole("listitem").filter({ hasText: order.order_number });
  await card.getByRole("button", { name: he.staff.deliveries.events.NOT_HOME }).click();
  await expect(card.getByText(he.tracking.status.DELIVERY_FAILED_NOT_HOME)).toBeVisible();
  await driver.close();

  const manager = await browser.newPage();
  await staffLogin(manager, "רונית בן דוד");
  await manager.goto(`/he/staff/orders/${order.id}`);
  await manager.getByRole("button", { name: he.staff.deliveries.events.RETURNED_TO_SHOP }).click();
  await expect(manager.getByText(he.tracking.status.RETURNED_TO_SHOP).first()).toBeVisible();

  await manager.getByRole("button", { name: he.staff.manager.REFUND.open }).click();
  await manager.getByLabel(he.staff.manager.amount).fill("50");
  await manager.getByLabel(he.staff.manager.reason).fill("המשלוח חזר, חלק נמכר מחדש");
  await manager.getByRole("button", { name: new RegExp(`^${lead(he.staff.manager.REFUND.confirm)}.*₪`) }).click();
  await expect(manager.getByText(he.tracking.status.PARTIALLY_REFUNDED).first()).toBeVisible();
  const [after] = await sql<{ refunded_agorot: number }[]>`select refunded_agorot from orders where id = ${order.id}`;
  expect(after.refunded_agorot).toBe(5_000);
  await manager.close();
});
