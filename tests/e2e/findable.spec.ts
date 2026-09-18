import { expect, test } from "@playwright/test";

/**
 * What a search engine sees. A bilingual shop that does not say which page is the canonical one, and
 * where its twin lives, competes against itself for every cut it sells.
 */

test("every public page names itself and its twin in the other language", async ({ page }) => {
  for (const path of ["/he", "/he/p/entrecote", "/he/c/beef", "/he/recipes/grilled-entrecote", "/he/cuts", "/he/compare", "/he/kashrut"]) {
    await test.step(path, async () => {
      await page.goto(path);
      const canonical = await page.locator("link[rel=canonical]").getAttribute("href");
      expect(canonical, `${path} has no canonical`).toContain(path);

      const alternates = await page.locator("link[rel=alternate][hreflang]").evaluateAll((links) =>
        links.map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]),
      );
      const langs = alternates.map(([lang]) => lang);
      expect(langs, path).toEqual(expect.arrayContaining(["he", "en", "x-default"]));
      // The English twin is the same page under /en, not the English home page.
      const en = alternates.find(([lang]) => lang === "en")![1]!;
      expect(en).toContain(path.replace("/he", "/en"));
    });
  }
});

test("the sitemap lists the shop and not the back office", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();

  for (const path of ["/he", "/en", "/he/cuts", "/he/recipes", "/he/compare", "/he/p/entrecote", "/en/p/entrecote"]) {
    expect(xml, `${path} missing from the sitemap`).toContain(`<loc>`);
    expect(xml).toMatch(new RegExp(`<loc>[^<]*${path}</loc>`));
  }
  // Nothing that needs a session or a token belongs in a search result.
  for (const secret of ["/staff", "/cart", "/checkout", "/account", "/orders/"]) {
    expect(xml, `${secret} should not be in the sitemap`).not.toContain(`${secret}</loc>`);
  }
  // Both languages, each page once.
  const count = (xml.match(/<loc>/g) ?? []).length;
  expect(count).toBeGreaterThan(100);
});

test("robots keeps crawlers out of the back office and points at the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();

  expect(text).toContain("Disallow: /he/staff");
  expect(text).toContain("Disallow: /he/checkout");
  expect(text).toContain("Disallow: /api/");
  expect(text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});
