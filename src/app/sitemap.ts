import type { MetadataRoute } from "next";
import { recipes } from "@/content/recipes";
import { OCCASIONS, occasionSlug } from "@/domain/catalog/occasions";
import { routing } from "@/i18n/routing";
import { listCategories, listProductSlugs } from "@/infra/db/queries/catalog";
import { resolveAppUrl } from "@/infra/runtimeEnv";

/**
 * Every page worth finding, in both languages, each pointing at its twin. The staff area, the cart, the
 * checkout and a customer's own order pages are deliberately absent — they are nobody's search result.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveAppUrl();
  const [categories, products] = await Promise.all([listCategories(), listProductSlugs()]);

  const paths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/cuts", priority: 0.8, changeFrequency: "monthly" },
    { path: "/recipes", priority: 0.8, changeFrequency: "weekly" },
    { path: "/compare", priority: 0.6, changeFrequency: "monthly" },
    { path: "/kashrut", priority: 0.7, changeFrequency: "monthly" },
    ...categories.map((c) => ({ path: `/c/${c.slug}`, priority: 0.9, changeFrequency: "daily" as const })),
    ...OCCASIONS.map((o) => ({ path: `/o/${occasionSlug(o)}`, priority: 0.7, changeFrequency: "weekly" as const })),
    ...products.map((p) => ({ path: `/p/${p.slug}`, priority: 0.9, changeFrequency: "daily" as const })),
    ...recipes.map((r) => ({ path: `/recipes/${r.slug}`, priority: 0.7, changeFrequency: "monthly" as const })),
  ];

  return paths.flatMap(({ path, priority, changeFrequency }) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
      },
    })),
  );
}
