import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { eventsFrom, type OrderStatus } from "@/domain/order/machine";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { activeNotifier } from "@/infra/notify/providers";
import { rescheduleOptions } from "@/infra/orders/customer";
import { loadStaffOrder } from "@/infra/staff/orderDetail";
import { requireStaff } from "@/infra/staff/session";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { DriverButtons } from "@/ui/staff/DriverButtons";
import { StuckCapture } from "@/ui/staff/StuckCapture";
import { type ManagerAction, ManagerActions } from "@/ui/staff/ManagerActions";
import { Reschedule } from "@/ui/shop/tracking/OrderActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await loadStaffOrder(id);
  return { title: data?.order.orderNumber ?? "—", robots: { index: false } };
}

const PICKABLE = ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_FAILED"];

export default async function StaffOrderPage({ params }: PageProps<"/[locale]/staff/orders/[id]">) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const member = await requireStaff(locale, "VIEW_BOARD");
  const role = member.role as StaffRole;
  const data = await loadStaffOrder(id);
  if (!data) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const { order: o, customer: c, slot, zone, lines, events, messages, intents } = data;
  const money = (a: number | null | undefined) => (a == null ? "—" : formatAgorot(agorot(a), locale));
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const addr = o.addressSnapshot as Record<string, string | null>;
  const authorized = intents.find((i) => i.status === "AUTHORIZED");
  const showMoney = can(role, "VIEW_MONEY");

  const pickReason = !can(role, "PICK_AND_WEIGH")
    ? t("orders.rejections.NOT_PERMITTED")
    : !PICKABLE.includes(o.status)
      ? t("orders.rejections.INVALID_TRANSITION")
      : null;

  const possible = eventsFrom(o.status as OrderStatus);
  const notPermitted = t("orders.rejections.NOT_PERMITTED");
  const refundableAgorot = Math.max(0, (o.capturedAgorot ?? 0) - o.refundedAgorot);
  const managerActions: ManagerAction[] = [
    possible.includes("FORCE_DISPATCHED") && { kind: "FORCE_DISPATCH" as const, blockedReason: can(role, "OVERRIDE") ? null : notPermitted },
    possible.includes("REFUND_REQUESTED") && {
      kind: "REFUND" as const,
      blockedReason: !can(role, "REFUND") ? notPermitted : refundableAgorot <= 0 ? t("staff.manager.nothingToRefund") : null,
    },
    possible.includes("CANCELLED_BY_SHOP") && { kind: "CANCEL" as const, blockedReason: can(role, "CANCEL_ORDER") ? null : notPermitted },
  ].filter((a): a is ManagerAction => Boolean(a));

  const beforeDispatch = ["AUTHORIZED", "PICKING", "AWAITING_CUSTOMER_APPROVAL", "WEIGHED", "REPRICED", "CAPTURE_PENDING", "CAPTURED", "CAPTURE_FAILED", "PACKED"].includes(o.status);
  const movable = can(role, "OVERRIDE") && (o.status === "DELIVERY_FAILED_NOT_HOME" || beforeDispatch);
  const windows = movable
    ? await rescheduleOptions(db, { zoneId: o.zoneId, slotId: o.slotId, cutAt: o.status === "DELIVERY_FAILED_NOT_HOME" ? (o.capturedAt ?? o.weighedAt) : (o.weighedAt ?? o.capturedAt), weightG: o.reservedWeightG })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/staff" className="text-char-700 w-fit text-sm underline-offset-4 hover:underline">
        {t("staff.order.back")}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-char-500 text-sm tabular-nums">{o.orderNumber}</p>
          <h1 className="text-3xl font-bold">
            {c.firstName} {c.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="wine">{t(`tracking.status.${o.status}`)}</Badge>
            {o.unpaidDispatch && <Badge tone="bad">{t("staff.order.unpaid")}</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!PICKABLE.includes(o.status) ? (
            <DriverButtons orderId={o.id} status={o.status} blockedReason={can(role, "DELIVER") ? null : t("orders.rejections.NOT_PERMITTED")} />
          ) : pickReason ? (
            <Button size="lg" disabledReason={pickReason}>
              {t("staff.order.startPicking")}
            </Button>
          ) : (
            <Link href={o.status === "AUTHORIZED" ? `/staff/pack/${o.id}?start=1` : `/staff/pack/${o.id}`} className="bg-wine-600 text-bone-50 hover:bg-wine-700 inline-flex min-h-16 items-center rounded-lg px-6 text-lg font-medium">
              {o.status === "AUTHORIZED" ? t("staff.order.startPicking") : t("staff.order.openWeighing")}
            </Link>
          )}
        </div>
      </header>

      <nav aria-label={t("staff.order.printouts")} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-char-500">{t("staff.order.printouts")}:</span>
        {(["pick", "label", "delivery-note"] as const).map((kind) => (
          <Link key={kind} href={`/staff/print/${kind}/${o.id}`} className="bg-bone-50 ring-bone-300 hover:ring-char-900 inline-flex min-h-11 items-center rounded-lg px-3 font-medium ring-1">
            {t(`staff.order.print.${kind === "delivery-note" ? "note" : kind}`)}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
          <h2 className="text-char-500 text-sm">{t("staff.order.slot")}</h2>
          {slot && (
            <p className="text-lg font-semibold">
              {format.dateTime(slot.startsAt, { weekday: "long", day: "numeric", month: "numeric" })}{" "}
              <bdi dir="ltr">
                {time(slot.startsAt)}–{time(slot.endsAt)}
              </bdi>
            </p>
          )}
          <p className="text-char-700">{locale === "he" ? zone.nameHe : zone.nameEn}</p>
          <h2 className="text-char-500 mt-4 text-sm">{t("staff.order.address")}</h2>
          <p>
            {addr.street} {addr.houseNumber}
            {addr.entrance ? ` · ${t("checkout.entrance")} ${addr.entrance}` : ""}
            {addr.floor ? ` · ${t("checkout.floor")} ${addr.floor}` : ""}
            {addr.apartment ? ` · ${t("checkout.apartment")} ${addr.apartment}` : ""}, {addr.city}
          </p>
          {addr.deliveryNotes && <p className="text-char-700 mt-1 text-sm">“{addr.deliveryNotes}”</p>}
          <p className="mt-2 tabular-nums">
            <bdi dir="ltr">{c.phoneE164}</bdi>
          </p>
        </section>

        {showMoney && (
          <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
            <h2 className="text-char-500 text-sm">{t("staff.order.money")}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <dt>{t("staff.order.estimate")}</dt>
              <dd className="text-end tabular-nums"><bdi>{money(o.estimateTotalAgorot)}</bdi></dd>
              <dt>{t("staff.order.hold")}</dt>
              <dd className="text-end font-semibold tabular-nums"><bdi>{money(o.authorizationCeilingAgorot)}</bdi></dd>
              <dt>{t("staff.order.final")}</dt>
              <dd className="text-end tabular-nums"><bdi>{money(o.finalTotalAgorot)}</bdi></dd>
              <dt>{t("staff.order.captured")}</dt>
              <dd className="text-end tabular-nums"><bdi>{money(o.capturedAgorot)}</bdi></dd>
              {o.refundedAgorot > 0 && (
                <>
                  <dt>{t("staff.order.refunded")}</dt>
                  <dd className="text-end tabular-nums"><bdi>{money(o.refundedAgorot)}</bdi></dd>
                </>
              )}
              {authorized && (
                <>
                  <dt>{t("staff.order.card")}</dt>
                  <dd className="text-end">
                    <bdi dir="ltr">
                      {authorized.cardBrand} •••• {authorized.cardLast4} · {authorized.provider}
                      {authorized.sandbox ? " (demo)" : ""}
                    </bdi>
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
          <h2 className="text-char-500 text-sm">{t("staff.order.timeline")}</h2>
          <ol className="mt-2 flex flex-col gap-2 text-sm">
            {events.map(({ event: e, staffNameHe, staffNameEn }) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>
                  {t(`tracking.status.${e.toStatus}`)}
                  {(staffNameHe || staffNameEn) && <span className="text-char-500"> · {locale === "he" ? staffNameHe : staffNameEn}</span>}
                </span>
                <bdi dir="ltr" className="text-char-500 tabular-nums">
                  {time(e.createdAt)}
                </bdi>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {o.status === "CAPTURE_PENDING" && <StuckCapture orderId={o.id} blockedReason={can(role, "CAPTURE_PAYMENT") ? null : t("orders.rejections.NOT_PERMITTED")} />}
      {movable && (
        <Reschedule target={{ by: "staff", orderId: o.id, reason: o.status === "DELIVERY_FAILED_NOT_HOME" ? "notHome" : "change" }} windows={windows.map((w) => ({ id: w.id, startsAt: w.startsAt.toISOString(), endsAt: w.endsAt.toISOString() }))} />
      )}
      {managerActions.length > 0 && <ManagerActions orderId={o.id} actions={managerActions} refundableAgorot={refundableAgorot} />}

      {(o.giftRecipient || o.giftMessage) && (
        <section className="border-brass-500 bg-bone-50 border-s-4 p-4" aria-labelledby="gift-title">
          <h2 id="gift-title" className="font-semibold">
            {t("staff.order.giftTitle")}
          </h2>
          {o.giftRecipient && <p className="mt-1">{t("staff.order.giftTo", { name: o.giftRecipient })}</p>}
          {o.giftMessage && <p className="text-char-700 mt-1 whitespace-pre-line">{o.giftMessage}</p>}
          <p className="text-char-500 mt-2 text-sm">{t("staff.order.giftHint")}</p>
        </section>
      )}

      <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
        <h2 className="text-lg font-bold">{t("staff.order.lines")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-char-500 text-xs">
              <tr className="border-bone-300 border-b">
                <th className="py-2 text-start font-medium" />
                <th className="py-2 text-start font-medium">{t("staff.order.requested")}</th>
                <th className="py-2 text-start font-medium">{t("staff.order.range")}</th>
                <th className="py-2 text-start font-medium">{t("staff.order.actual")}</th>
                {showMoney && <th className="py-2 text-end font-medium">{t("staff.order.estimate")}</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-bone-200 border-b align-top">
                  <td className="py-3">
                    <div className="font-semibold">{locale === "he" ? l.productNameHe : l.productNameEn}</div>
                    <div className="text-char-700">{locale === "he" ? (l.cutInstructionHe ?? l.variantNameHe) : (l.cutInstructionEn ?? l.variantNameEn)}</div>
                    {l.customerNote && <div className="text-wine-700">{t("staff.order.note")}: {l.customerNote}</div>}
                    <div className="text-char-500 text-xs">{l.allowSubstitute ? t("staff.order.substitute") : t("staff.order.noSubstitute")}</div>
                  </td>
                  <td className="py-3 tabular-nums"><bdi>{l.estimatedG ? formatGrams(grams(l.estimatedG), locale) : `× ${l.quantity}`}</bdi></td>
                  <td className="py-3 tabular-nums">
                    {l.toleranceMinG && l.toleranceMaxG ? (
                      <bdi>
                        {formatGrams(grams(l.toleranceMinG), locale)}–{formatGrams(grams(l.toleranceMaxG), locale)}
                      </bdi>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 tabular-nums"><bdi>{l.actualG ? formatGrams(grams(l.actualG), locale) : "—"}</bdi></td>
                  {showMoney && <td className="py-3 text-end tabular-nums"><bdi>{money(l.finalAgorot ?? l.estimateAgorot)}</bdi></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
        <h2 className="text-lg font-bold">{t("staff.order.messages")}</h2>
        {activeNotifier().demo && <p className="text-warn-600 mt-1 text-sm font-medium">{t("staff.order.demoMessages")}</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="bg-bone-100 rounded-xl p-3">
              <div className="text-char-500 flex flex-wrap justify-between gap-2 text-xs">
                <span>
                  {m.templateKey} · {m.channel} · {m.provider} · {m.status}
                </span>
                <bdi dir="ltr" className="tabular-nums">{time(m.queuedAt)}</bdi>
              </div>
              <p className="mt-1 text-sm whitespace-pre-line" dir={m.locale === "he" ? "rtl" : "ltr"}>
                {m.renderedBody}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
