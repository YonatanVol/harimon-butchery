import { expect, test } from "@playwright/test";
import { e2eDb, messages, staffLogin } from "./support/app";

/**
 * A review's whole life in the running shop: a customer who was delivered a cut writes one, nothing shows
 * on the site until a staff member publishes it, and then it counts on the cut's page.
 */
test("a delivered cut is reviewed, published, and appears on its page", async ({ page }) => {
  const m = messages("he").shop;
  const staff = messages("he").staff.reviews;

  // Someone with a delivered cut they have not reviewed. The seed always leaves a few.
  const [waiting] = await e2eDb()`
    select c.phone_e164 as phone, p.slug, p.name_he as name
    from orders o
    join customer c on c.id = o.customer_id
    join order_line ol on ol.order_id = o.id
    join product_variant v on v.id = ol.variant_id
    join product p on p.id = v.product_id
    left join product_review r on r.order_id = o.id and r.product_id = p.id
    where o.status = 'DELIVERED' and r.id is null
      and ol.substituted_with_variant_id is null
      and ol.status not in ('SHORT', 'CANCELLED', 'SUBSTITUTED')
    limit 1`;
  expect(waiting, "the seed left no cut to review").toBeTruthy();
  const phone = String(waiting.phone).replace(/^\+972/, "0");
  const body = `בדיקה אוטומטית: הנתח הגיע קר ואטום, ויצא בדיוק כמו שרצינו. ${Date.now()}`;

  await page.goto("/he/account");
  await page.getByLabel(m.account.login.phone).fill(phone);
  await page.getByRole("button", { name: m.account.login.sendCode }).click();
  const demo = page.getByRole("status").filter({ hasText: m.account.login.demoCode });
  await expect(demo).toBeVisible();
  await page.getByLabel(m.account.login.code, { exact: true }).fill((await demo.textContent())!.match(/\d{6}/)![0]);

  // Inside the invitations only: the order history below mentions the same cuts.
  const invites = page.getByRole("region", { name: m.account.reviewsTitle });
  const invite = invites.getByRole("listitem").filter({ hasText: String(waiting.name) }).first();
  await expect(invite).toBeVisible();
  await invite.getByRole("button", { name: m.account.reviewsWrite }).click();

  // The send button says why it is unusable before anything has been chosen.
  const send = page.getByRole("button", { name: m.reviews.form.submit });
  await expect(send).toBeDisabled();
  await expect(invite.getByText(m.reviews.form.ratingMissing)).toBeVisible();

  // The fifth star: the radio itself is for screen readers, people tap the star around it.
  await invite.locator("label:has(input[type=radio])").nth(4).click();
  await expect(invite.getByRole("radio").nth(4)).toBeChecked();
  await invite.getByLabel(m.reviews.form.body).fill(body);
  await send.click();
  await expect(page.getByRole("status").filter({ hasText: m.reviews.form.sent })).toBeVisible();

  // Nothing on the cut's page yet: a review is read before it is shown.
  await page.goto(`/he/p/${waiting.slug}`);
  await expect(page.getByText(body)).toHaveCount(0);

  await staffLogin(page, "רונית בן דוד");
  await page.goto("/he/staff/reviews");
  const row = page.getByRole("listitem").filter({ hasText: body });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: staff.publish }).click();
  await expect(row).toHaveCount(0);

  // The cut's page is prerendered and revalidated in the background, so the first view after publishing
  // can still be the old one. It catches up on the next view, within a second.
  await expect
    .poll(
      async () => {
        await page.goto(`/he/p/${waiting.slug}`);
        return page.getByText(body).count();
      },
      { timeout: 20_000, message: "the published review never appeared on the cut's page" },
    )
    .toBe(1);
  await expect(page.getByRole("heading", { name: m.reviews.title })).toBeVisible();
});
