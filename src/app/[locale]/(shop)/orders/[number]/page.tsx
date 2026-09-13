import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { OrderStatus } from "@/domain/order/machine";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import { tidyRelative } from "@/i18n/relativeTime";
import type { Locale } from "@/i18n/routing";
import { toleranceBounds } from "@/domain/weight/tolerance";
import { priceForWeight } from "@/domain/weight/reprice";
import { db } from "@/infra/db/client";
import { expireApprovals, rescheduleOptions } from "@/infra/orders/customer";
import { loadTrackedOrder } from "@/infra/orders/queries";
import { appUrl } from "@/infra/payments/factory";
import { CancelOrder, ExtraApproval, Reschedule } from "@/ui/shop/tracking/OrderActions";
import { cx } from "@/ui/cx";

export async function generateMetadata({ params }: PageProps<"/[locale]/orders/[number]">): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "tracking" });
  return { title: t("title", { number }), robots: { index: false } };
}

const MILESTONES: Array<{ key: OrderStatus; reachedBy: OrderStatus[] }> = [
  { key: "AUTHORIZED", reachedBy: ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", "DELIVERED", "CLOSED"] },
  { key: "PICKING", reachedBy: ["PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", "DELIVERED", "CLOSED"] },
  { key: "CAPTURED", reachedBy: ["CAPTURED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", "DELIVERED", "CLOSED"] },
  { key: "OUT_FOR_DELIVERY", reachedBy: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", "DELIVERED", "CLOSED"] },
  { key: "DELIVERED", reachedBy: ["DELIVERED", "CLOSED"] },
];

export default async function TrackingPage({ params, searchParams }: PageProps<"/[locale]/orders/[number]">) {
  const { locale: raw, number } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const sp = await searchParams;
  const t = await getTranslations("tracking");
  const format = await getFormatter();
  await expireApprovals(db, { appUrl: appUrl() });
  const token = typeof sp.t === "string" ? sp.t : "";
  const data = await loadTrackedOrder(number, token);

  if (!data) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
        <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
        <p className="font-reading text-char-700 text-lg">{t("notFoundBody")}</p>
        <Link href="/" className="bg-char-900 text-bone-50 inline-flex min-h-12 items-center rounded-lg px-6 font-medium">
          {(await getTranslations("shop.notFound"))("back")}
        </Link>
      </div>
    );
  }

  const { order: o, customer: c, slot, lines, events, intent } = data;
  const money = (a: number | null) => (a == null ? "—" : formatAgorot(agorot(a), locale));
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const addr = o.addressSnapshot as { street: string; houseNumber: string; city: string; apartment?: string | null; floor?: string | null };
  const captured = o.capturedAgorot != null;
  const g = (n: number) => formatGrams(grams(n), locale);
  const pendingLine = o.status === "AWAITING_CUSTOMER_APPROVAL" ? lines.find((l) => l.pendingActualG) : undefined;
  const pendingBounds = pendingLine ? toleranceBounds(grams(pendingLine.estimatedG!), pendingLine.toleranceBp!) : null;
  const windows = o.status === "DELIVERY_FAILED_NOT_HOME" ? await rescheduleOptions(db, o) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {sp.placed === "1" && (
        <div role="status" className="bg-ok-600/10 ring-ok-600/25 mb-8 rounded-2xl p-5 ring-1">
          <p className="text-ok-600 text-lg font-bold">{t("placedTitle")}</p>
          <p className="font-reading text-char-700">
            {t("placedBody", { phone: c.phoneE164.replace(/^\+972/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") })}
          </p>
        </div>
      )}

      <header className="flex flex-col gap-2">
        <p className="text-char-500 text-sm tabular-nums">{t("title", { number: o.orderNumber })}</p>
        <h1 className="text-4xl font-bold tracking-tight">{t(`status.${o.status}`)}</h1>
        <p className="text-lg font-medium">
          {captured
            ? t("finalSummary", { final: money(o.capturedAgorot), hold: money(o.authorizationCeilingAgorot) })
            : t("holdSummary", { hold: money(o.authorizationCeilingAgorot) })}
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        {pendingLine && pendingBounds && o.approvalDeadlineAt && (
          <ExtraApproval
            orderNumber={o.orderNumber}
            token={token}
            productName={locale === "he" ? pendingLine.productNameHe : pendingLine.productNameEn}
            actualWeight={g(pendingLine.pendingActualG!)}
            requestedWeight={g(pendingLine.estimatedG!)}
            trimmedWeight={g(pendingBounds.max)}
            extraAmount={money(priceForWeight(agorot(pendingLine.pricePerKgAgorot!), grams(pendingLine.pendingActualG!)) - pendingLine.ceilingAgorot)}
            deadline={o.approvalDeadlineAt.toISOString()}
          />
        )}
        {o.status === "DELIVERY_FAILED_NOT_HOME" && (
          <Reschedule target={{ by: "customer", orderNumber: o.orderNumber, token }} windows={windows.map((w) => ({ id: w.id, startsAt: w.startsAt.toISOString(), endsAt: w.endsAt.toISOString() }))} />
        )}
        {o.status === "AUTHORIZED" && <CancelOrder orderNumber={o.orderNumber} token={token} />}
      </div>

      <ol className="mt-8 grid grid-cols-5 gap-2" aria-label={t("timeline")}>
        {MILESTONES.map((m) => {
          const reached = m.reachedBy.includes(o.status);
          return (
            <li key={m.key} className="flex flex-col gap-2">
              <span className={cx("h-1.5 rounded-full", reached ? "bg-wine-600" : "bg-bone-300")} />
              <span className={cx("text-xs leading-tight", reached ? "text-char-900 font-medium" : "text-char-500")}>{t(`status.${m.key}`)}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="bg-bone-100 rounded-2xl p-5">
          <h2 className="text-char-500 text-sm font-medium">{t("delivery")}</h2>
          {slot && (
            <p className="mt-1 text-lg font-semibold">
              {format.dateTime(slot.startsAt, { weekday: "long", day: "numeric", month: "long" })}{" "}
              <bdi dir="ltr">
                {time(slot.startsAt)}–{time(slot.endsAt)}
              </bdi>
            </p>
          )}
          <p className="text-char-700 mt-1">
            {t("deliveryTo")} {addr.street} {addr.houseNumber}
            {addr.apartment ? `/${addr.apartment}` : ""}, {addr.city}
          </p>
        </section>
        <section className="bg-bone-100 rounded-2xl p-5">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt>{t("estimateTotal")}</dt>
              <dd><bdi className="tabular-nums">{money(o.estimateTotalAgorot)}</bdi></dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("holdLine")}</dt>
              <dd><bdi className="font-semibold tabular-nums">{money(o.authorizationCeilingAgorot)}</bdi></dd>
            </div>
            {intent?.cardLast4 && (
              <div className="text-char-500 flex justify-between">
                <dt />
                <dd><bdi dir="ltr">{t("card", { brand: intent.cardBrand ?? "", last4: intent.cardLast4 })}</bdi></dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">{t("lines")}</h2>
        {o.goodwillAgorot > 0 && (
          <p className="bg-ok-600/10 text-ok-600 mt-3 rounded-xl p-3 font-medium">{t("goodwill", { amount: money(o.goodwillAgorot) })}</p>
        )}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-char-500 text-xs">
              <tr className="border-bone-300 border-b">
                <th className="py-2 text-start font-medium" />
                <th className="py-2 text-start font-medium">{t("requested")}</th>
                <th className="py-2 text-start font-medium">{t("actual")}</th>
                <th className="py-2 text-end font-medium">{t("estimate")}</th>
                <th className="py-2 text-end font-medium">{t("final")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-bone-200 border-b">
                  <td className="py-3">
                    <div className="font-medium">{locale === "he" ? l.productNameHe : l.productNameEn}</div>
                    <div className="text-char-500 text-xs">{locale === "he" ? l.variantNameHe : l.variantNameEn}</div>
                  </td>
                  <td className="py-3 tabular-nums">
                    <bdi>{l.estimatedG ? formatGrams(grams(l.estimatedG), locale) : `× ${l.quantity}`}</bdi>
                  </td>
                  <td className="py-3 tabular-nums">
                    <bdi>{l.actualG ? formatGrams(grams(l.actualG), locale) : "—"}</bdi>
                  </td>
                  <td className="text-char-500 py-3 text-end tabular-nums">
                    <bdi>{money(l.estimateAgorot)}</bdi>
                  </td>
                  <td className="py-3 text-end font-medium tabular-nums">
                    <bdi>{l.status === "SHORT" ? t("short") : l.status === "SUBSTITUTED" ? t("substituted") : l.finalAgorot != null ? money(l.finalAgorot) : "—"}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">{t("timeline")}</h2>
        <ol className="border-bone-300 mt-4 flex flex-col gap-4 border-s-2 ps-5">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span aria-hidden className="bg-wine-600 absolute -start-[27px] top-1.5 size-3 rounded-full ring-4 ring-bone-50" />
              <p className="font-medium">{t(`status.${e.toStatus}`)}</p>
              <p className="text-char-500 text-sm">{tidyRelative(format.relativeTime(e.createdAt))} · <bdi dir="ltr">{time(e.createdAt)}</bdi></p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
