import { expect, test } from "@playwright/test";

/**
 * The shop on a phone's home screen: the manifest a browser needs to offer installing it, the icons it
 * draws, and what happens when the connection goes. Runs against the production build, which is the only
 * place the service worker is registered.
 */

test("the manifest and its icons are real files", async ({ page, request }) => {
  await page.goto("/he");
  const href = await page.locator("link[rel=manifest]").getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");

  const response = await request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("manifest");

  const manifest = await response.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.start_url).toBe("/he");
  expect(manifest.display).toBe("standalone");
  expect(manifest.dir).toBe("rtl");

  // Chrome needs a 192 and a 512, and Android needs one it may crop to a circle.
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);

  for (const icon of manifest.icons as Array<{ src: string }>) {
    const file = await request.get(icon.src);
    expect(file.status(), `${icon.src} is missing`).toBe(200);
    expect(file.headers()["content-type"]).toBe("image/png");
  }

  const apple = await page.locator("link[rel=apple-touch-icon]").getAttribute("href");
  expect((await request.get(apple!)).status()).toBe(200);
});

test("a shared link carries an absolute preview image", async ({ page }) => {
  // Without metadataBase these come out relative, and WhatsApp shows a link with no photo.
  await page.goto("/he/p/entrecote");
  for (const property of ["og:image", "og:title"]) {
    const content = await page.locator(`meta[property="${property}"]`).first().getAttribute("content");
    expect(content, property).toBeTruthy();
    if (property === "og:image") expect(content).toMatch(/^https?:\/\//);
  }
});

test("with no connection the shop says so, and comes back when it returns", async ({ page, context }) => {
  await page.goto("/he");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });

  await context.setOffline(true);
  await page.goto("/he/cuts");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("אין חיבור לרשת");

  await context.setOffline(false);
  await page.goto("/he/cuts");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("אין חיבור לרשת");
});
