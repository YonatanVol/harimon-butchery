import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { addDays, fromIsoDate, israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { loadDeliveryRun } from "@/infra/orders/delivery";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { DriverButtons } from "@/ui/staff/DriverButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/deliveries">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.deliveries" });
  return { title: t("title"), robots: { index: false } };
}

type Address = { city?: string; street?: string; houseNumber?: string; entrance?: string | null; floor?: string | null; apartment?: string | null; intercom?: string | null; deliveryNotes?: string | null };

export default async function DeliveriesPage({ params, searchParams }: PageProps<"/[locale]/staff/deliveries">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const member = await requireStaff(locale, "VIEW_BOARD");
  const canDeliver = can(member.role as StaffRole, "DELIVER");
  const sp = await searchParams;
  const t = await getTranslations();
  const format = await getFormatter();
  const now = await getNow();

  const today = toIsoDate(israelDateOf(now));
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const prev = toIsoDate(addDays(fromIsoDate(date), -1));
  const next = toIsoDate(addDays(fromIsoDate(date), 1));
  const rows = await loadDeliveryRun(db, date);
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const windows = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.startsAt.toISOString()}|${r.endsAt.toISOString()}`;
    windows.set(key, [...(windows.get(key) ?? []), r]);
  }
  const open = rows.filter((r) => r.status !== "DELIVERED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("staff.deliveries.title")}</h1>
          <p className="text-char-700">
            {format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {t("staff.deliveries.summary", { open, total: rows.length })}
          </p>
        </div>
        <nav className="bg-bone-200 flex rounded-xl p-1" aria-label={t("staff.deliveries.dayNav")}>
          <Link href={`/staff/deliveries?date=${prev}`} className="text-char-700 inline-flex min-h-12 items-center rounded-lg px-4 font-medium">
            {t("staff.deliveries.prevDay")}
          </Link>
          <Link
            href="/staff/deliveries"
            aria-current={date === today ? "page" : undefined}
            className={cx("inline-flex min-h-12 items-center rounded-lg px-4 font-medium", date === today ? "bg-bone-50 shadow-sm" : "text-char-700")}
          >
            {t("staff.board.today")}
          </Link>
          <Link href={`/staff/deliveries?date=${next}`} className="text-char-700 inline-flex min-h-12 items-center rounded-lg px-4 font-medium">
            {t("staff.deliveries.nextDay")}
          </Link>
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="bg-bone-50 text-char-700 rounded-2xl p-8 text-center text-lg">{t("staff.deliveries.empty")}</p>
      ) : (
        [...windows.entries()].map(([key, items]) => (
          <section key={key} aria-labelledby={`w-${key}`} className="flex flex-col gap-3">
            <h2 id={`w-${key}`} className="flex items-center gap-3 text-xl font-bold">
              <bdi dir="ltr" className="tabular-nums">
                {time(items[0].startsAt)}–{time(items[0].endsAt)}
              </bdi>
              <span className="bg-char-900 text-bone-50 grid min-w-7 place-items-center rounded-full px-2 text-sm tabular-nums">{items.length}</span>
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((r) => {
                const a = r.address as Address;
                const line1 = `${a.street ?? ""} ${a.houseNumber ?? ""}, ${a.city ?? ""}`.trim();
                const details = [
                  a.entrance && `${t("checkout.entrance")} ${a.entrance}`,
                  a.floor && `${t("checkout.floor")} ${a.floor}`,
                  a.apartment && `${t("checkout.apartment")} ${a.apartment}`,
                  a.intercom && `${t("staff.deliveries.intercom")} ${a.intercom}`,
                ].filter(Boolean);
                const delivered = r.status === "DELIVERED";
                return (
                  <li key={r.id} className={cx("bg-bone-50 ring-bone-300 flex flex-col gap-3 rounded-2xl p-4 ring-1", r.unpaidDispatch && "ring-bad-600 ring-2", delivered && "opacity-70")}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">
                          {r.firstName} {r.lastName}
                        </p>
                        <p className="text-lg">{line1}</p>
                        {details.length > 0 && <p className="text-char-700">{details.join(" · ")}</p>}
                        {a.deliveryNotes && <p className="text-wine-700 mt-1">“{a.deliveryNotes}”</p>}
                        {r.note && <p className="text-wine-700 mt-1">“{r.note}”</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={delivered ? "ok" : r.status === "DELIVERY_FAILED_NOT_HOME" ? "warn" : "wine"}>{t(`tracking.status.${r.status}`)}</Badge>
                        {r.unpaidDispatch && <Badge tone="bad">{t("staff.order.unpaid")}</Badge>}
                        {r.attempts > 1 && <span className="text-char-500 text-sm">{t("staff.deliveries.attempt", { count: r.attempts })}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <a href={`tel:${r.phone}`} className="bg-bone-100 ring-bone-300 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium ring-1">
                        {t("staff.deliveries.call")} <bdi dir="ltr" className="tabular-nums">{r.phone}</bdi>
                      </a>
                      <a
                        href={`https://waze.com/ul?q=${encodeURIComponent(line1)}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-bone-100 ring-bone-300 inline-flex min-h-11 items-center rounded-lg px-3 font-medium ring-1"
                      >
                        {t("staff.deliveries.navigate")}
                      </a>
                      <Link href={`/staff/orders/${r.id}`} className="text-char-700 inline-flex min-h-11 items-center px-2 underline-offset-4 hover:underline">
                        <span className="tabular-nums">{r.orderNumber}</span>
                      </Link>
                      <span className="text-char-500">{locale === "he" ? r.zoneHe : r.zoneEn}</span>
                    </div>
                    <DriverButtons orderId={r.id} status={r.status} blockedReason={canDeliver ? null : t("orders.rejections.NOT_PERMITTED")} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
