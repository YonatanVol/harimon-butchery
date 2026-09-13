import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { addDays, fromIsoDate, israelDateOf, toIsoDate, weekdayOf } from "@/domain/delivery/israelTime";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { deliveryZone } from "@/infra/db/schema";
import { loadZoneWeek, previewWindows } from "@/infra/delivery/manage";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { ApplyWindows, BlackoutForm, RemoveBlackout, ZoneEditor } from "@/ui/staff/ZoneTools";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/zones">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.zones" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ZonesPage({ params, searchParams }: PageProps<"/[locale]/staff/zones">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  await requireStaff(locale, "MANAGE_SLOTS");
  const sp = await searchParams;
  const t = await getTranslations("staff.zones");
  const format = await getFormatter();
  const now = await getNow();

  const zones = await db.select().from(deliveryZone).orderBy(asc(deliveryZone.sortOrder));
  const zone = zones.find((z) => z.slug === sp.zone) ?? zones[0];
  if (!zone) return <p className="bg-bone-50 rounded-2xl p-8 text-center">{t("noZones")}</p>;

  // Weeks start on Sunday, as in Israel.
  const today = israelDateOf(now);
  const thisSunday = addDays(today, -weekdayOf(today));
  const weekStart = typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : toIsoDate(thisSunday);
  const days = Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(fromIsoDate(weekStart), i)));
  const [{ slots, blackouts }, preview] = await Promise.all([loadZoneWeek(db, { zoneId: zone.id, weekStart }), previewWindows(db, { days: 28, now })]);

  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const kg = (g: number) => (g / 1000).toLocaleString(locale === "he" ? "he-IL" : "en-IL", { maximumFractionDigits: 1 });
  const dayLabel = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { weekday: "short", day: "numeric", month: "numeric" });
  const href = (q: Record<string, string>) => `/staff/zones?${new URLSearchParams({ zone: zone.slug, week: weekStart, ...q })}`;
  const pendingChanges = preview.added + preview.opening.length + preview.closing.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </header>

      <nav aria-label={t("zones")} className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <Link
            key={z.id}
            href={`/staff/zones?zone=${z.slug}&week=${weekStart}`}
            aria-current={z.id === zone.id ? "page" : undefined}
            className={cx("inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium ring-1", z.id === zone.id ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300")}
          >
            {locale === "he" ? z.nameHe : z.nameEn}
            {!z.active && <span className="text-xs opacity-75">· {t("paused")}</span>}
          </Link>
        ))}
      </nav>

      {pendingChanges > 0 && (
        <section className="border-warn-600 bg-warn-600/10 flex flex-col gap-3 rounded-2xl border-s-8 p-5">
          <h2 className="text-lg font-bold">{t("pendingTitle")}</h2>
          <p>{t("pendingSummary", { added: preview.added, opening: preview.opening.length, closing: preview.closing.length })}</p>
          {preview.affectedOrders.length > 0 && (
            <div>
              <p className="text-bad-600 font-semibold">{t("affectedTitle", { count: preview.affectedOrders.length })}</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {preview.affectedOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/staff/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>{" "}
                    · {o.firstName} {o.lastName} · <bdi dir="ltr">{o.phone}</bdi>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ApplyWindows affected={preview.affectedOrders.length} />
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-labelledby="week-title" className="bg-bone-50 ring-bone-300 flex min-w-0 flex-col gap-4 rounded-2xl p-5 ring-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="week-title" className="text-lg font-bold">
              {t("week", { from: dayLabel(days[0]), to: dayLabel(days[6]) })}
            </h2>
            <div className="flex gap-2">
              <Link href={href({ week: toIsoDate(addDays(fromIsoDate(weekStart), -7)) })} className="bg-bone-100 ring-bone-300 inline-flex min-h-11 items-center rounded-lg px-3 text-sm ring-1">
                {t("prevWeek")}
              </Link>
              <Link href={href({ week: toIsoDate(thisSunday) })} className="bg-bone-100 ring-bone-300 inline-flex min-h-11 items-center rounded-lg px-3 text-sm ring-1">
                {t("thisWeek")}
              </Link>
              <Link href={href({ week: toIsoDate(addDays(fromIsoDate(weekStart), 7)) })} className="bg-bone-100 ring-bone-300 inline-flex min-h-11 items-center rounded-lg px-3 text-sm ring-1">
                {t("nextWeek")}
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[840px] grid-cols-7 gap-2">
              {days.map((d) => {
                const daySlots = slots.filter((s) => s.serviceDate === d);
                return (
                  <div key={d} className="flex flex-col gap-2">
                    <div className="text-center">
                      <div className="font-semibold">{dayLabel(d)}</div>
                      {daySlots[0]?.hebrewDateHe && <div className="text-char-500 text-xs">{daySlots[0].hebrewDateHe}</div>}
                    </div>
                    {daySlots.length === 0 ? (
                      <p className="text-char-500 border-bone-300 rounded-lg border border-dashed p-2 text-center text-xs">{t("noWindows")}</p>
                    ) : (
                      daySlots.map((s) => {
                        const open = s.status === "OPEN";
                        const full = s.reservedOrders >= s.capacityOrders;
                        return (
                          <div key={s.id} className={cx("rounded-lg p-2 text-xs ring-1", !open ? "bg-bone-200 text-char-500 ring-bone-300" : full ? "bg-warn-600/10 ring-warn-600/40" : "bg-bone-50 ring-bone-300")}>
                            <bdi dir="ltr" className="block text-sm font-semibold tabular-nums">
                              {time(s.startsAt)}–{time(s.endsAt)}
                            </bdi>
                            {open ? (
                              <>
                                <div className="tabular-nums">{t("orders", { used: s.reservedOrders, capacity: s.capacityOrders })}</div>
                                <div className="tabular-nums">{t("kg", { used: kg(s.reservedWeightG), capacity: kg(s.capacityWeightG) })}</div>
                              </>
                            ) : (
                              <div className="font-medium">{(locale === "he" ? s.blackoutReasonHe : s.blackoutReasonEn) ?? t("closed")}</div>
                            )}
                            {!open && s.reservedOrders > 0 && <div className="text-bad-600 font-semibold">{t("bookedInClosed", { count: s.reservedOrders })}</div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-bone-300 flex flex-col gap-3 border-t pt-4">
            <h3 className="font-bold">{t("closures")}</h3>
            {blackouts.length === 0 ? (
              <p className="text-char-500 text-sm">{t("noClosures")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {blackouts.map((b) => (
                  <li key={b.id} className="bg-bone-100 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-sm">
                    <span>
                      <strong>{dayLabel(b.date)}</strong>{" "}
                      {b.fromTime && b.toTime ? (
                        <bdi dir="ltr">
                          {b.fromTime.slice(0, 5)}–{b.toTime.slice(0, 5)}
                        </bdi>
                      ) : (
                        t("allDay")
                      )}{" "}
                      · {locale === "he" ? b.reasonHe : b.reasonEn} · <span className="text-char-500">{b.zoneId ? t("thisZoneOnly") : t("allZones")}</span>
                    </span>
                    <RemoveBlackout id={b.id} />
                  </li>
                ))}
              </ul>
            )}
            <BlackoutForm zoneId={zone.id} zoneName={locale === "he" ? zone.nameHe : zone.nameEn} defaultDate={days.find((d) => d >= toIsoDate(today)) ?? days[0]} />
          </div>
        </section>

        <aside className="bg-bone-50 ring-bone-300 flex flex-col gap-4 rounded-2xl p-5 ring-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{locale === "he" ? zone.nameHe : zone.nameEn}</h2>
            <Badge tone={zone.active ? "ok" : "neutral"}>{zone.active ? t("active") : t("paused")}</Badge>
          </div>
          <p className="text-char-700 text-sm">
            {t("summary", {
              fee: formatAgorot(agorot(zone.deliveryFeeAgorot), locale),
              min: formatAgorot(agorot(zone.minOrderAgorot), locale),
              lead: Math.round(zone.leadTimeMinutes / 60),
            })}
          </p>
          <ZoneEditor
            key={zone.id}
            zone={{
              id: zone.id,
              citiesHe: zone.citiesHe,
              citiesEn: zone.citiesEn,
              deliveryFeeAgorot: zone.deliveryFeeAgorot,
              freeDeliveryOverAgorot: zone.freeDeliveryOverAgorot,
              minOrderAgorot: zone.minOrderAgorot,
              active: zone.active,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
