import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { recipeBySlug, recipes } from "@/content/recipes";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { getProduct } from "@/infra/db/queries/catalog";
import { formatDuration, RecipeCard, recipePhoto, totalMinutes } from "@/ui/shop/RecipeCard";
import { type KitchenMeat, RecipeKitchen, StepTimer } from "@/ui/shop/RecipeKitchen";

export const revalidate = 60;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => recipes.map((r) => ({ locale, slug: r.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/recipes/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const r = recipeBySlug(slug);
  if (!r) return {};
  const he = locale === "he";
  const title = he ? r.titleHe : r.titleEn;
  const description = he ? r.introHe : r.introEn;
  return { title, description, openGraph: { title, description, images: [{ url: recipePhoto(r) }] } };
}

export default async function RecipePage({ params }: PageProps<"/[locale]/recipes/[slug]">) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const r = recipeBySlug(slug);
  if (!r) notFound();
  const t = await getTranslations("shop");
  const he = locale === "he";
  const title = he ? r.titleHe : r.titleEn;

  const meat: KitchenMeat[] = (
    await Promise.all(
      r.meat.map(async (m): Promise<KitchenMeat | null> => {
        const data = await getProduct(m.product);
        if (!data) return null;
        const v = data.variants.find((x) => x.isDefault) ?? data.variants[0];
        if (!v) return null;
        const p = data.product;
        return {
          productId: p.id,
          variantId: v.id,
          slug: p.slug,
          nameHe: p.nameHe,
          nameEn: p.nameEn,
          pricingMode: p.pricingMode,
          pricePerKgAgorot: p.pricePerKgAgorot === null ? null : p.pricePerKgAgorot + v.priceDeltaAgorot,
          packagePriceAgorot: p.packagePriceAgorot === null ? null : p.packagePriceAgorot + v.priceDeltaAgorot,
          minOrderG: p.minOrderG,
          maxOrderG: p.maxOrderG,
          stepG: p.stepG,
          out: data.availability.kind === "OUT",
          gramsPerServing: m.gramsPerServing,
          quantity: m.quantity,
          noteHe: m.noteHe,
          noteEn: m.noteEn,
        };
      }),
    )
  ).filter((m): m is KitchenMeat => m !== null);

  const related = recipes.filter((x) => x.slug !== r.slug && x.occasion === r.occasion).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: title,
    description: he ? r.introHe : r.introEn,
    image: [recipePhoto(r)],
    recipeYield: String(r.servings),
    prepTime: `PT${r.prepMinutes}M`,
    cookTime: `PT${r.cookMinutes}M`,
    totalTime: `PT${totalMinutes(r)}M`,
    recipeCategory: t(`occasion.${r.occasion}`),
    recipeIngredient: [...meat.map((m) => (he ? m.nameHe : m.nameEn)), ...(he ? r.ingredientsHe : r.ingredientsEn)],
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: he ? s.he : s.en })),
  };

  const meta = [
    { label: t("recipes.prep"), value: await formatDuration(r.prepMinutes) },
    { label: t("recipes.cook"), value: await formatDuration(r.cookMinutes) },
    ...(r.restMinutes ? [{ label: t("recipes.rest"), value: await formatDuration(r.restMinutes) }] : []),
    { label: t("recipes.difficultyLabel"), value: t(`recipes.difficulty.${r.difficulty}`) },
  ];

  return (
    <article className="mx-auto max-w-7xl sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="breadcrumb" className="text-char-500 flex flex-wrap gap-2 px-4 py-4 text-sm sm:px-0">
        <Link href="/recipes" className="hover:text-char-900">
          {t("recipes.title")}
        </Link>
        <span aria-hidden>/</span>
        <span className="first-letter:uppercase">{t(`occasion.${r.occasion}`)}</span>
      </nav>

      <header className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-14">
        <div className="bg-bone-200 relative aspect-[4/3] overflow-hidden sm:rounded-[3px]">
          <Image src={recipePhoto(r)} alt={t("recipes.photoAlt", { cut: meat[0] ? (he ? meat[0].nameHe : meat[0].nameEn) : title })} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="motion-safe:animate-settle object-cover" />
        </div>
        <div className="flex flex-col gap-4 px-4 sm:px-0">
          <p className="text-brass-700 text-xs font-semibold tracking-[0.08em] first-letter:uppercase">{t(`occasion.${r.occasion}`)}</p>
          <h1 className="rise-1 font-display text-[42px] leading-[1.04] font-light sm:text-6xl">{title}</h1>
          <p className="rise-2 text-char-700 text-lg leading-relaxed">{he ? r.introHe : r.introEn}</p>
          <dl className="border-bone-300 grid grid-cols-2 border-y sm:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label} className="flex flex-col py-3">
                <dt className="text-char-500 order-2 text-xs">{m.label}</dt>
                <dd className="order-1 font-semibold">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-14 grid gap-14 px-4 sm:px-0 lg:grid-cols-[1fr_1.2fr]">
        <RecipeKitchen baseServings={r.servings} meat={meat} ingredientsHe={r.ingredientsHe} ingredientsEn={r.ingredientsEn} />

        <div className="flex flex-col gap-10">
          <section aria-labelledby="steps-title">
            <h2 id="steps-title" className="font-display text-2xl">
              {t("recipes.method")}
            </h2>
            <ol className="mt-5 flex flex-col">
              {r.steps.map((s, i) => (
                <li key={i} className="border-bone-300 grid grid-cols-[2.5rem_1fr] gap-x-3 border-t py-5">
                  <span className="font-display text-brass-700 text-3xl leading-none tabular-nums">{i + 1}</span>
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] leading-relaxed">{he ? s.he : s.en}</p>
                    {s.minutes ? <StepTimer minutes={s.minutes} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {r.donenessC && r.donenessC.length > 0 && (
            <section aria-labelledby="doneness-title" className="flex flex-col gap-4">
              <h2 id="doneness-title" className="font-display text-2xl">
                {t("recipes.doneness")}
              </h2>
              <ul className="border-bone-300 grid grid-cols-2 border sm:grid-cols-4">
                {r.donenessC.map((d) => (
                  <li key={d.tempC} className="border-bone-300 flex flex-col gap-1 border-b p-4 text-center sm:border-b-0 sm:not-last:border-e">
                    <span className="font-display text-3xl tabular-nums" dir="ltr">
                      {d.tempC}°
                    </span>
                    <span className="text-char-700 text-sm">{he ? d.he : d.en}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <aside className="bg-bone-50 border-bone-300 flex flex-col gap-2 border p-6">
            <span aria-hidden className="bg-brass-500 h-px w-8" />
            <h2 className="font-display text-xl">{t("product.tipTitle")}</h2>
            <p className="text-char-700 leading-relaxed">{he ? r.tipHe : r.tipEn}</p>
          </aside>
        </div>
      </div>

      {related.length > 0 && (
        <section className="reveal mt-24 px-4 sm:px-0" aria-labelledby="related-title">
          <h2 id="related-title" className="font-display text-3xl">
            {t("recipes.related")}
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((x) => (
              <RecipeCard key={x.slug} recipe={x} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
