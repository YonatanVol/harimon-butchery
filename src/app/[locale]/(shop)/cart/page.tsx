import { after } from "next/server";
import { db as sweepDb } from "@/infra/db/client";
import { expireAbandonedCheckouts } from "@/infra/orders/authorization";
import { appUrl, paymentProvider } from "@/infra/payments/factory";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { orderableMaxG } from "@/domain/catalog/availability";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listCategories } from "@/infra/db/queries/catalog";
import { loadCartView, loadSlotDays } from "@/infra/cart/repository";
import { readCartToken } from "@/infra/cart/session";
import { Button } from "@/ui/primitives/Button";
import { CartLineRow } from "@/ui/shop/cart/CartLineRow";
import { DeliveryPanel } from "@/ui/shop/cart/DeliveryPanel";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.cart" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  // Abandoned payment pages give back their windows and stock, after this response is sent.
  after(() => expireAbandonedCheckouts(sweepDb, paymentProvider(), { appUrl: appUrl() }).catch((e) => console.error("abandoned checkout sweep", e)));
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("shop");
  const now = new Date();
  const view = await loadCartView(await readCartToken(), now);

  if (!view || view.lines.length === 0) {
    const categories = (await listCategories()).slice(0, 3);
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <h1 className="font-display text-4xl font-light md:text-5xl">{t("cart.empty")}</h1>
        <p className="font-reading text-char-700 text-lg">{t("cart.emptyBody")}</p>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="bg-char-900 text-bone-50 inline-flex min-h-12 items-center rounded-[2px] px-6 font-medium">
                {locale === "he" ? c.nameHe : c.nameEn}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { cart, lines, zone, zones, hold, quote } = view;
  const days = zone ? await loadSlotDays(zone.id, cart.id, now) : [];
  const available = lines.filter((l) => !l.unavailable);
  const servedCities = zones.filter((z) => z.active).flatMap((z) => (locale === "he" ? z.citiesHe : z.citiesEn));
  const money = (a: number) => formatAgorot(agorot(a), locale);

  // The checkout button names the first thing still missing.
  const blocker =
    available.length === 0
      ? t("cart.needLines")
      : !zone
        ? t("cart.needCity")
        : quote.minOrderGap !== null
          ? t("cart.needMin", { amount: money(quote.minOrderGap) })
          : !hold
            ? t("cart.needSlot")
            : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-light md:text-5xl">{t("cart.title")}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <ul className="divide-bone-300 border-bone-300 divide-y border-y">
            {lines.map((l) => {
              const stockG = l.availability.kind === "OUT" ? 0 : l.availability.availableG;
              const stockUnits = l.availability.kind === "OUT" ? 0 : l.availability.availableUnits;
              return (
                <CartLineRow
                  key={l.line.id}
                  line={{
                    id: l.line.id,
                    productSlug: l.product.slug,
                    nameHe: l.product.nameHe,
                    nameEn: l.product.nameEn,
                    variantNameHe: l.variant.nameHe,
                    variantNameEn: l.variant.nameEn,
                    showVariant: l.variantCount > 1,
                    animal: l.product.animal,
                    image: l.product.image,
                    pricingMode: l.product.pricingMode,
                    pricePerKgAgorot: l.priced.mode === "WEIGHT" ? l.priced.pricePerKg : null,
                    unitPriceAgorot: l.priced.mode === "PACKAGE" ? l.priced.unitPrice : null,
                    requestedG: l.line.requestedG,
                    quantity: l.line.quantity,
                    minG: l.product.minOrderG,
                    maxG: l.product.maxOrderG,
                    stepG: l.product.stepG,
                    toleranceBp: l.product.toleranceBp,
                    stockMaxG:
                      l.product.pricingMode === "WEIGHT"
                        ? Math.max(l.line.requestedG ?? 0, orderableMaxG(l.product.maxOrderG!, l.product.stepG!, l.product.minOrderG!, stockG))
                        : 0,
                    stockMaxUnits: Math.max(l.line.quantity ?? 0, stockUnits),
                    allowSubstitute: l.line.allowSubstitute,
                    note: l.line.customerNote,
                    unavailable: l.unavailable,
                  }}
                />
              );
            })}
          </ul>

          <DeliveryPanel
            city={cart.city}
            zone={
              zone
                ? {
                    nameHe: zone.nameHe,
                    nameEn: zone.nameEn,
                    deliveryFeeAgorot: zone.deliveryFeeAgorot,
                    freeDeliveryOverAgorot: zone.freeDeliveryOverAgorot,
                    minOrderAgorot: zone.minOrderAgorot,
                  }
                : null
            }
            servedCities={servedCities}
            days={days}
            held={
              hold
                ? {
                    slotId: hold.slot.id,
                    expiresAt: hold.hold.expiresAt.toISOString(),
                    startsAt: hold.slot.startsAt.toISOString(),
                    endsAt: hold.slot.endsAt.toISOString(),
                  }
                : null
            }
          />
        </div>

        <aside aria-labelledby="summary-title" className="bg-bone-100 ring-bone-300 sticky top-32 flex flex-col gap-4 rounded-[3px] p-5 ring-1">
          <h2 id="summary-title" className="sr-only">
            {t("cart.estimateTotal")}
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{quote.hasWeightLines ? t("cart.itemsEstimate") : t("cart.itemsExact")}</dt>
              <dd>
                <bdi className="tabular-nums">{money(quote.itemsEstimate)}</bdi>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t("cart.delivery")}</dt>
              <dd>
                {!quote.zoneKnown ? (
                  <span className="text-char-500">{t("cart.deliveryUnknown")}</span>
                ) : quote.freeDelivery ? (
                  <span className="text-ok-600 font-medium">{t("cart.deliveryFree")}</span>
                ) : (
                  <bdi className="tabular-nums">{money(quote.deliveryFee)}</bdi>
                )}
              </dd>
            </div>
            {quote.freeDeliveryGap !== null && (
              <p className="text-wine-700 bg-wine-600/10 rounded-[2px] px-3 py-2 text-sm">{t("cart.freeGap", { amount: money(quote.freeDeliveryGap) })}</p>
            )}
            <div className="border-bone-300 flex justify-between gap-4 border-t pt-3 text-lg font-bold">
              <dt>{quote.hasWeightLines ? t("cart.estimateTotal") : t("cart.exactTotal")}</dt>
              <dd>
                <bdi className="tabular-nums">{money(quote.estimateTotal)}</bdi>
              </dd>
            </div>
            {quote.hasWeightLines && (
              <div className="flex justify-between gap-4">
                <dt className="flex flex-col">
                  {t("cart.holdLine")}
                  <Link href="/#how-weight-works" className="text-wine-600 text-xs underline-offset-4 hover:underline">
                    {t("cart.holdExplain")}
                  </Link>
                </dt>
                <dd>
                  <bdi className="font-semibold tabular-nums">{money(quote.authorizationCeiling)}</bdi>
                </dd>
              </div>
            )}
          </dl>
          {quote.minOrderGap !== null && (
            <p className="text-warn-600 bg-warn-600/10 rounded-[2px] px-3 py-2 text-sm font-medium">{t("cart.minGap", { amount: money(quote.minOrderGap) })}</p>
          )}
          {blocker ? (
            <Button size="lg" fullWidth disabledReason={blocker}>
              {t("cart.checkout")}
            </Button>
          ) : (
            <Link
              href="/checkout"
              className="bg-wine-600 text-bone-50 hover:bg-wine-700 inline-flex min-h-16 w-full items-center justify-center rounded-[2px] px-6 text-center text-lg font-medium"
            >
              {quote.hasWeightLines
                ? t("cart.checkoutHold", { amount: money(quote.authorizationCeiling) })
                : t("cart.checkoutExact", { amount: money(quote.estimateTotal) })}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
