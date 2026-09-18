import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { factsFor } from "@/content/productFacts";
import { pricePerServing } from "@/domain/catalog/perServing";
import { formatTenths } from "@/domain/catalog/reviews";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories, listProducts } from "@/infra/db/queries/catalog";
import { AvailabilityChip } from "@/ui/shop/AvailabilityChip";
import { ComparePicker, type PickerGroup } from "@/ui/shop/ComparePicker";
import { ProductImage } from "@/ui/shop/ProductImage";
import { RatingLine } from "@/ui/shop/reviews/Stars";

export const revalidate = 60;

const SLOTS = 3;

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.compare" });
  return { title: t("title"), description: t("lead") };
}

/** A row of the table: one fact, drawn for each cut, or nothing when no cut has it. */
function Row({ label, values }: { label: string; values: Array<React.ReactNode> }) {
  if (values.every((v) => v === null || v === undefined || v === "")) return null;
  return (
    <tr className="border-bone-300 border-t align-top">
      <th scope="row" className="text-char-500 w-32 py-3 pe-3 text-start text-sm font-normal sm:w-44">
        {label}
      </th>
      {values.map((v, i) => (
        // The cuts keep their column order, so the column position is the identity here.
        // eslint-disable-next-line react/no-array-index-key
        <td key={i} className="py-3 pe-3 last:pe-0">
          {v ?? <span className="text-char-500">—</span>}
        </td>
      ))}
    </tr>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`${label}: ${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "bg-char-900 h-1.5 w-4" : "bg-bone-300 h-1.5 w-4"} />
      ))}
    </span>
  );
}

export default async function ComparePage({ params, searchParams }: PageProps<"/[locale]/compare">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const sp = await searchParams;
  const t = await getTranslations("shop");
  const he = locale === "he";

  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const asked = (typeof sp.cuts === "string" ? sp.cuts : "").split(",").map((s) => s.trim()).filter(Boolean);
  // Only cuts the shop actually sells, each at most once, at most three.
  const chosen = [...new Set(asked)].filter((s) => bySlug.has(s)).slice(0, SLOTS);
  const slots: Array<string | null> = Array.from({ length: SLOTS }, (_, i) => chosen[i] ?? null);
  const cuts = chosen.map((s) => bySlug.get(s)!);

  const groups: PickerGroup[] = categories
    .map((c) => ({
      label: he ? c.nameHe : c.nameEn,
      items: products.filter((p) => p.categorySlug === c.slug).map((p) => ({ slug: p.slug, name: he ? p.nameHe : p.nameEn })),
    }))
    .filter((g) => g.items.length > 0);

  const price = (p: (typeof products)[number]) =>
    p.pricingMode === "WEIGHT"
      ? t("card.perKg", { price: formatAgorot(agorot(p.pricePerKgAgorot!), locale) })
      : t("card.perPackage", { price: formatAgorot(agorot(p.packagePriceAgorot!), locale) });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-12 text-center sm:py-16">
        <span aria-hidden className="bg-brass-500 h-px w-12" />
        <h1 className="rise-1 font-display text-5xl font-light sm:text-6xl">{t("compare.title")}</h1>
        <p className="rise-2 text-char-700 max-w-xl text-lg leading-relaxed">{t("compare.lead")}</p>
      </header>

      <ComparePicker slots={slots} groups={groups} labels={Array.from({ length: SLOTS }, (_, i) => t("compare.slot", { n: i + 1 }))} />

      {cuts.length === 0 ? (
        <p className="text-char-700 mt-10 text-center text-lg">{t("compare.empty")}</p>
      ) : (
        <div className="scrollbar-none mt-10 overflow-x-auto pb-24">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <caption className="sr-only">{t("compare.title")}</caption>
            <thead>
              <tr>
                <td />
                {cuts.map((p) => (
                  <th key={p.id} scope="col" className="w-1/4 pe-3 text-start align-bottom last:pe-0">
                    <Link href={`/p/${p.slug}`} className="group flex flex-col gap-2">
                      <ProductImage src={p.image} alt="" animal={p.animal!} label={he ? p.nameHe : p.nameEn} sizes="200px" className="aspect-[4/5] rounded-[2px]" />
                      <span className="font-display text-xl leading-tight group-hover:underline">{he ? p.nameHe : p.nameEn}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label={t("compare.price")} values={cuts.map((p) => <bdi key={p.id} className="font-semibold tabular-nums">{price(p)}</bdi>)} />
              <Row
                label={t("compare.perServing")}
                values={cuts.map((p) => {
                  const facts = factsFor(p.slug);
                  if (p.pricingMode !== "WEIGHT" || !facts?.servingG) return null;
                  return (
                    <bdi key={p.id} className="tabular-nums">
                      {formatAgorot(pricePerServing(agorot(p.pricePerKgAgorot!), facts.servingG), locale)}
                    </bdi>
                  );
                })}
              />
              <Row
                label={t("compare.serving")}
                values={cuts.map((p) => {
                  const facts = factsFor(p.slug);
                  return facts?.servingG ? <bdi key={p.id}>{formatGrams(grams(facts.servingG), locale)}</bdi> : null;
                })}
              />
              <Row label={t("compare.availability")} values={cuts.map((p) => <AvailabilityChip key={p.id} availability={p.availability} />)} />
              <Row
                label={t("compare.rating")}
                values={cuts.map((p) =>
                  p.rating ? (
                    <RatingLine key={p.id} averageTenths={p.rating.averageTenths} count={p.rating.count} label={t("reviews.ariaAverage", { average: formatTenths(p.rating.averageTenths) })} />
                  ) : (
                    <span key={p.id} className="text-char-500 text-sm">
                      {t("compare.noReviews")}
                    </span>
                  ),
                )}
              />
              <Row label={t("compare.methods")} values={cuts.map((p) => factsFor(p.slug)?.methods.map((m) => t(`product.method.${m}`)).join(" · ") ?? null)} />
              <Row label={t("compare.cookTime")} values={cuts.map((p) => { const f = factsFor(p.slug); return f ? (he ? f.cookTimeHe : f.cookTimeEn) : null; })} />
              <Row
                label={t("compare.coreTemp")}
                values={cuts.map((p) => {
                  const c = factsFor(p.slug)?.donenessC;
                  return c ? (
                    <bdi key={p.id} dir="ltr" className="tabular-nums">
                      {c}°
                    </bdi>
                  ) : null;
                })}
              />
              <Row label={t("compare.fat")} values={cuts.map((p) => { const f = factsFor(p.slug); return f ? <Meter key={p.id} value={f.fat} label={t("compare.fat")} /> : null; })} />
              <Row label={t("compare.tenderness")} values={cuts.map((p) => { const f = factsFor(p.slug); return f ? <Meter key={p.id} value={f.tenderness} label={t("compare.tenderness")} /> : null; })} />
              <Row label={t("compare.aging")} values={cuts.map((p) => (p.agingDays ? t("card.aged", { days: p.agingDays }) : null))} />
              <Row label={t("compare.origin")} values={cuts.map((p) => (he ? p.cutOriginHe : p.cutOriginEn))} />
              <Row label={t("compare.kashrut")} values={cuts.map((p) => [he ? p.authorityBadgeHe : p.authorityBadgeEn, p.glatt === "GLATT_CHALAK" ? t("kashrut.GLATT_CHALAK") : null, p.passover === "KOSHER_LEPESACH" ? t("kashrut.KOSHER_LEPESACH") : null].filter(Boolean).join(" · "))} />
              <Row label={t("compare.tip")} values={cuts.map((p) => { const f = factsFor(p.slug); return f ? <span key={p.id} className="text-char-700 block max-w-xs text-sm leading-relaxed">{he ? f.tipHe : f.tipEn}</span> : null; })} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
