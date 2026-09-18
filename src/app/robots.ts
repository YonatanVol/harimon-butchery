import type { MetadataRoute } from "next";
import { resolveAppUrl } from "@/infra/runtimeEnv";

/**
 * The shop is public; the back office, the cart and a customer's own order pages are not. Those carry a
 * token or a session, so this is a courtesy to well-behaved crawlers, not a security measure.
 */
export default function robots(): MetadataRoute.Robots {
  const base = resolveAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/he/staff", "/en/staff", "/he/cart", "/en/cart", "/he/checkout", "/en/checkout", "/he/orders/", "/en/orders/", "/he/account", "/en/account", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
