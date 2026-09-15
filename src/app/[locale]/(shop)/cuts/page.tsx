import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { factsFor } from "@/content/productFacts";
import { CUT_ANIMALS, REGIONS, slugsInRegion } from "@/domain/catalog/cutRegions";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listProducts } from "@/infra/db/queries/catalog";
import { CutMap } from "@/ui/shop/CutMap";
import { ProductImage } from "@/ui/shop/ProductImage";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[locale]/cuts">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.cuts" });
  return { title: t("title"), description: t("lead") };
}

export default async function CutsPage({ params }: PageProps<"/[locale]/cuts">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("shop");
  const he = locale === "he";
  const products = await listProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-14 text-center sm:py-20">
        <span aria-hidden className="bg-brass-500 h-px w-12" />
        <h1 className="rise-1 font-display text-5xl font-light sm:text-6xl">{t("cuts.title")}</h1>
        <p className="rise-2 text-char-700 max-w-xl text-lg leading-relaxed">{t("cuts.lead")}</p>
        <nav aria-label={t("cuts.animals")} className="rise-3 mt-2 flex flex-wrap justify-center gap-2">
          {CUT_ANIMALS.map((a) => (
            <a key={a} href={`#${a.toLowerCase()}`} className="border-bone-300 hover:border-char-900 inline-flex min-h-11 items-center border px-5 text-sm">
              {t(`cuts.animal.${a}`)}
            </a>
          ))}
        </nav>
      </header>

      {CUT_ANIMALS.map((animal) => {
        const regions = (REGIONS[animal] as readonly string[]).map((region) => ({
          region,
          items: slugsInRegion(animal, region)
            .map((s) => bySlug.get(s))
            .filter((p): p is NonNullable<typeof p> => Boolean(p)),
        }));
        const labels = Object.fromEntries(regions.map((r) => [r.region, t(`cuts.region.${animal}.${r.region}`)]));
        const withItems = regions.filter((r) => r.items.length > 0);
        const id = animal.toLowerCase();
        return (
          <section key={animal} id={id} className="scroll-mt-28 pb-20" aria-labelledby={`${id}-title`}>
            <div className="border-char-900 grid gap-8 border-t pt-6 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
              <div className="flex flex-col gap-3 lg:sticky lg:top-32 lg:self-start">
                <h2 id={`${id}-title`} className="font-display text-4xl">
                  {t(`cuts.animal.${animal}`)}
                </h2>
                <p className="text-char-700 leading-relaxed">{t(`cuts.animalIntro.${animal}`)}</p>
                <div className="bg-bone-50 border-bone-300 mt-2 border p-4 sm:p-6">
                  <CutMap
                    animal={animal}
                    active={[]}
                    available={withItems.map((r) => r.region)}
                    labels={labels}
                    title={t("cuts.mapTitle", { animal: t(`cuts.animal.${animal}`) })}
                    hrefFor={(r) => (withItems.some((x) => x.region === r) ? `#${id}-${r}` : null)}
                  />
                </div>
                <p className="text-char-500 text-xs">{t("cuts.mapHint")}</p>
              </div>

              <div className="flex flex-col">
                {withItems.map(({ region, items }) => (
                  <div key={region} id={`${id}-${region}`} className="border-bone-300 scroll-mt-32 border-b py-6 first:pt-0">
                    <h3 className="font-display text-2xl">{labels[region]}</h3>
                    <p className="text-char-500 mt-1 text-sm">{t(`cuts.regionIntro.${animal}.${region}`)}</p>
                    <ul className="mt-4 flex flex-col gap-3">
                      {items.map((p) => {
                        const facts = factsFor(p.slug);
                        return (
                          <li key={p.id}>
                            <Link href={`/p/${p.slug}`} className="group hover:bg-bone-50 -mx-2 flex items-center gap-4 p-2 transition-colors">
                              <ProductImage src={p.image} alt="" animal={p.animal!} label={he ? p.nameHe : p.nameEn} sizes="96px" className="size-20 shrink-0 rounded-[2px] sm:size-24" />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="font-display text-xl">{he ? p.nameHe : p.nameEn}</span>
                                <span className="text-char-500 line-clamp-1 text-sm">{he ? p.shortDescHe : p.shortDescEn}</span>
                                {facts && (
                                  <span className="text-char-700 text-xs">
                                    {facts.methods.map((m) => t(`product.method.${m}`)).join(" · ")} · {he ? facts.cookTimeHe : facts.cookTimeEn}
                                  </span>
                                )}
                              </span>
                              <bdi className="shrink-0 text-sm font-semibold tabular-nums">
                                {p.pricingMode === "WEIGHT"
                                  ? t("card.perKg", { price: formatAgorot(agorot(p.pricePerKgAgorot!), locale) })
                                  : t("card.perPackage", { price: formatAgorot(agorot(p.packagePriceAgorot!), locale) })}
                              </bdi>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
