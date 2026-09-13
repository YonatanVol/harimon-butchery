import { after } from "next/server";
import { db as sweepDb } from "@/infra/db/client";
import { expireAbandonedCheckouts } from "@/infra/orders/authorization";
import { appUrl, paymentProvider } from "@/infra/payments/factory";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import type { CheckoutDetails } from "@/domain/checkout/details";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { loadCartView } from "@/infra/cart/repository";
import { readCartToken } from "@/infra/cart/session";
import { db } from "@/infra/db/client";
import { paymentIntent } from "@/infra/db/schema";
import { CheckoutForm } from "@/ui/shop/checkout/CheckoutForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

const DECLINE_KEYS = ["INSUFFICIENT_FUNDS", "CARD_BLOCKED", "AUTHENTICATION_FAILED", "EXPIRED_CARD", "GENERIC_DECLINE", "AMOUNT_MISMATCH"] as const;

export default async function CheckoutPage({ params, searchParams }: PageProps<"/[locale]/checkout">) {
  // Abandoned payment pages give back their windows and stock, after this response is sent.
  after(() => expireAbandonedCheckouts(sweepDb, paymentProvider(), { appUrl: appUrl() }).catch((e) => console.error("abandoned checkout sweep", e)));
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const sp = await searchParams;
  const t = await getTranslations();
  const format = await getFormatter();
  const view = await loadCartView(await readCartToken());
  const money = (a: number) => formatAgorot(agorot(a), locale);

  const declined = DECLINE_KEYS.find((k) => k === sp.declined) ?? null;
  const pendingIntent = typeof sp.pending === "string" ? sp.pending : null;
  const [pending] =
    pendingIntent && /^[0-9a-f-]{36}$/.test(pendingIntent)
      ? await db.select().from(paymentIntent).where(eq(paymentIntent.id, pendingIntent))
      : [];

  const ready = view && view.lines.some((l) => !l.unavailable) && view.zone && view.hold && view.quote.minOrderGap === null;

  if (!ready) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
        {declined && <DeclinedNotice title={t("checkout.declinedTitle")} reason={t(`checkout.declined.${declined}`)} body={t("checkout.declinedBody")} />}
        <h1 className="text-3xl font-bold">{t("checkout.title")}</h1>
        <p className="font-reading text-char-700 text-lg">{t("checkout.needCart")}</p>
        <Link href="/cart" className="bg-char-900 text-bone-50 inline-flex min-h-12 items-center rounded-lg px-6 font-medium">
          {t("checkout.backToCart")}
        </Link>
      </div>
    );
  }

  const { quote, hold, lines, cart } = view;
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const now = await getNow();
  const minutesLeft = Math.max(0, Math.ceil((hold!.hold.expiresAt.getTime() - now.getTime()) / 60000));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">{t("checkout.title")}</h1>
      <ol className="text-char-500 mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label={t("checkout.title")}>
        <li className="text-char-900 font-semibold">1. {t("checkout.steps.details")}</li>
        <li>
          <Link href="/cart" className="underline-offset-4 hover:underline">
            2. {t("checkout.steps.slot")} ✓
          </Link>
        </li>
        <li>3. {t("checkout.steps.payment")}</li>
      </ol>

      {declined && (
        <div className="mt-6">
          <DeclinedNotice title={t("checkout.declinedTitle")} reason={t(`checkout.declined.${declined}`)} body={t("checkout.declinedBody")} />
        </div>
      )}
      {pending?.hostedPageUrl && pending.status !== "AUTHORIZED" && pending.status !== "DECLINED" && (
        <div role="status" className="bg-warn-600/10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <div>
            <p className="text-warn-600 font-semibold">{t("checkout.pendingTitle")}</p>
            <p className="text-char-700 text-sm">{t("checkout.pendingBody")}</p>
          </div>
          <a href={pending.hostedPageUrl} className="bg-char-900 text-bone-50 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-medium">
            {t("checkout.resumePayment")}
          </a>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="min-w-0">
          <CheckoutForm
            draft={(cart.checkoutDraft as Partial<CheckoutDetails> | null) ?? null}
            city={cart.city ?? ""}
            submitLabel={
              quote.hasWeightLines
                ? t("checkout.submitHold", { amount: money(quote.authorizationCeiling) })
                : t("checkout.submitCharge", { amount: money(quote.estimateTotal) })
            }
          />
        </div>

        <aside className="bg-bone-100 ring-bone-300 sticky top-32 flex flex-col gap-4 rounded-2xl p-5 ring-1" aria-labelledby="co-summary">
          <h2 id="co-summary" className="text-lg font-bold">
            {t("checkout.summaryTitle")}
          </h2>
          <div className="bg-bone-50 flex items-center justify-between gap-3 rounded-lg p-3">
            <div>
              <p className="text-char-500 text-xs">{t("checkout.slotTitle")}</p>
              <p className="font-medium">
                {format.dateTime(hold!.slot.startsAt, { weekday: "long", day: "numeric", month: "numeric" })}{" "}
                <bdi dir="ltr">
                  {time(hold!.slot.startsAt)}–{time(hold!.slot.endsAt)}
                </bdi>
              </p>
              <p className="text-char-500 text-xs">{t("checkout.slotHeldFor", { minutes: minutesLeft })}</p>
            </div>
            <Link href="/cart" className="text-wine-600 text-sm font-medium underline-offset-4 hover:underline">
              {t("checkout.changeSlot")}
            </Link>
          </div>
          <ul className="divide-bone-300 flex flex-col divide-y text-sm">
            {lines
              .filter((l) => !l.unavailable)
              .map((l) => (
                <li key={l.line.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {locale === "he" ? l.product.nameHe : l.product.nameEn}{" "}
                    <bdi className="text-char-500">
                      {l.line.requestedG ? formatGrams(grams(l.line.requestedG), locale) : `× ${l.line.quantity}`}
                    </bdi>
                  </span>
                </li>
              ))}
          </ul>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt>{quote.hasWeightLines ? t("shop.cart.itemsEstimate") : t("shop.cart.itemsExact")}</dt>
              <dd><bdi className="tabular-nums">{money(quote.itemsEstimate)}</bdi></dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("shop.cart.delivery")}</dt>
              <dd>{quote.freeDelivery ? t("shop.cart.deliveryFree") : <bdi className="tabular-nums">{money(quote.deliveryFee)}</bdi>}</dd>
            </div>
            <div className="border-bone-300 flex justify-between border-t pt-2 text-base font-bold">
              <dt>{quote.hasWeightLines ? t("shop.cart.estimateTotal") : t("shop.cart.exactTotal")}</dt>
              <dd><bdi className="tabular-nums">{money(quote.estimateTotal)}</bdi></dd>
            </div>
          </dl>
          <p className="bg-bone-50 text-char-700 font-reading rounded-lg p-3 text-sm">
            {quote.hasWeightLines
              ? t("checkout.holdNote", { hold: money(quote.authorizationCeiling) })
              : t("checkout.chargeNote", { amount: money(quote.estimateTotal) })}
          </p>
        </aside>
      </div>
    </div>
  );
}

function DeclinedNotice({ title, reason, body }: { title: string; reason: string; body: string }) {
  return (
    <div role="alert" className="border-bad-600 bg-bad-600/10 w-full rounded-xl border-s-4 p-4">
      <p className="text-bad-600 font-semibold">{title}</p>
      <p className="font-medium">{reason}</p>
      <p className="text-char-700 text-sm">{body}</p>
    </div>
  );
}
