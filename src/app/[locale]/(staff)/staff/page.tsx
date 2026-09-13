import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { addDays, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import { tidyRelative } from "@/i18n/relativeTime";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { expireAbandonedCheckouts } from "@/infra/orders/authorization";
import { appUrl, paymentProvider } from "@/infra/payments/factory";
import { BOARD_COLUMNS, loadAlerts, loadBoard } from "@/infra/staff/board";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.board" });
  return { title: t("title"), robots: { index: false } };
}

export default async function BoardPage({ params, searchParams }: PageProps<"/[locale]/staff">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const sp = await searchParams;
  const member = await requireStaff(locale, "VIEW_BOARD");
  const showMoney = can(member.role as StaffRole, "VIEW_MONEY");
  const t = await getTranslations("staff.board");
  const format = await getFormatter();
  const now = await getNow();

  const today = toIsoDate(israelDateOf(now));
  const tomorrow = toIsoDate(addDays(israelDateOf(now), 1));
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  // Payment pages abandoned for a while give back their windows and stock before the board is drawn.
  await expireAbandonedCheckouts(db, paymentProvider(), { appUrl: appUrl() });
  const [{ rows, slots }, alerts] = await Promise.all([loadBoard(date), loadAlerts(now)]);
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const when = (d: Date) => tidyRelative(format.relativeTime(d, now));

  return (
    <div className="flex flex-col gap-6">
      {typeof sp.denied === "string" && (
        <p role="alert" className="bg-bad-600/10 text-bad-600 rounded-xl p-3 font-medium">
          {t("denied", { capability: sp.denied })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <nav className="bg-bone-200 flex rounded-xl p-1" aria-label={t("title")}>
          {[
            { d: today, label: t("today") },
            { d: tomorrow, label: t("tomorrow") },
          ].map((x) => (
            <Link
              key={x.d}
              href={`/staff?date=${x.d}`}
              aria-current={date === x.d ? "page" : undefined}
              className={cx("inline-flex min-h-12 items-center rounded-lg px-5 font-medium", date === x.d ? "bg-bone-50 shadow-sm" : "text-char-700")}
            >
              {x.label} · {format.dateTime(new Date(`${x.d}T12:00:00Z`), { day: "numeric", month: "numeric" })}
            </Link>
          ))}
        </nav>
      </div>

      {alerts.length > 0 && (
        <section aria-labelledby="alerts-title" className="border-bad-600 bg-bad-600/5 rounded-2xl border-s-4 p-4">
          <h2 id="alerts-title" className="text-bad-600 font-bold">
            {t("alertsTitle")}
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {a.key === "CERT_EXPIRING"
                    ? t("alerts.CERT_EXPIRING", { authority: locale === "he" ? a.authorityHe : a.authorityEn, when: when(a.when) })
                    : "when" in a
                      ? t(`alerts.${a.key}`, { number: a.orderNumber, when: when(a.when) })
                      : t(`alerts.${a.key}`, { number: a.orderNumber })}
                </span>
                {"orderId" in a && (
                  <Link href={`/staff/orders/${a.orderId}`} className="bg-char-900 text-bone-50 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium">
                    {t("open")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {slots.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {slots.map((s) => (
            <li key={s.id} className="bg-bone-50 ring-bone-300 rounded-lg px-3 py-2 ring-1">
              <span className="font-medium">{locale === "he" ? s.zoneHe : s.zoneEn}</span>{" "}
              <bdi dir="ltr">
                {time(s.startsAt)}–{time(s.endsAt)}
              </bdi>{" "}
              <span className="text-char-500">
                {t("slotUse", { used: s.reservedOrders, capacity: s.capacityOrders, kg: (s.reservedWeightG / 1000).toLocaleString(locale === "he" ? "he-IL" : "en-IL", { maximumFractionDigits: 1 }) })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 ? (
        <p className="bg-bone-50 text-char-700 rounded-2xl p-8 text-center text-lg">{t("emptyDay")}</p>
      ) : (
        <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(BOARD_COLUMNS) as Array<keyof typeof BOARD_COLUMNS>).map((col) => {
            const items = rows.filter((r) => BOARD_COLUMNS[col].includes(r.status));
            return (
              <section key={col} aria-labelledby={`col-${col}`} className="flex min-w-0 flex-col gap-3">
                <h2 id={`col-${col}`} className="flex items-center justify-between font-bold">
                  {t(`columns.${col}`)}
                  <span className="bg-char-900 text-bone-50 grid min-w-7 place-items-center rounded-full px-2 text-sm tabular-nums">{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="text-char-500 border-bone-300 rounded-xl border border-dashed p-4 text-center text-sm">{t("emptyColumn")}</p>
                ) : (
                  items.map((r) => (
                    <Link
                      key={r.id}
                      href={`/staff/orders/${r.id}`}
                      className={cx(
                        "bg-bone-50 ring-bone-300 hover:ring-char-900 flex min-h-24 flex-col gap-1 rounded-xl p-4 ring-1",
                        r.status === "CAPTURE_FAILED" && "ring-bad-600 ring-2",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold tabular-nums">{r.orderNumber}</span>
                        <bdi dir="ltr" className="text-char-700 text-sm tabular-nums">
                          {time(r.startsAt)}–{time(r.endsAt)}
                        </bdi>
                      </div>
                      <span>
                        {r.firstName} {r.lastName} · <span className="text-char-500">{locale === "he" ? r.zoneHe : r.zoneEn}</span>
                      </span>
                      <span className="text-char-700 text-sm">
                        {t("lines", { count: r.lineCount })}
                        {showMoney && ` · ${t("hold", { amount: formatAgorot(agorot(r.hold), locale) })}`}
                      </span>
                    </Link>
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

