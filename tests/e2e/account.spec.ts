import { expect, test } from "@playwright/test";
import { lead, messages } from "./support/app";

test("a customer signs in with a code and sees their orders", async ({ page }) => {
  const m = messages("he").shop.account;
  await page.goto("/he/account");
  await page.getByLabel(m.login.phone).fill("052-381-4472");
  await page.getByRole("button", { name: m.login.sendCode }).click();

  // Demo mode shows the code on screen instead of sending a real WhatsApp message.
  const demo = page.getByRole("status").filter({ hasText: m.login.demoCode });
  await expect(demo).toBeVisible();
  const code = (await demo.textContent())!.match(/\d{6}/)![0];

  await page.getByLabel(m.login.code, { exact: true }).fill("000000" === code ? "111111" : "000000");
  await expect(page.getByRole("alert").filter({ hasText: lead(m.login.problems.WRONG_CODE) })).toBeVisible();
  await page.getByLabel(m.login.code, { exact: true }).fill(code);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(new RegExp(`^${lead(m.hello)}`));
  await expect(page.getByRole("link", { name: /\d{4}-\d{5}/ }).first()).toBeVisible();
});
