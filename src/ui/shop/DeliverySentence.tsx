import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { israelDateOf, toIsoDate } from "@/domain/delivery/israelTime";
import type { Locale } from "@/i18n/routing";
import { nextDeliveryForDefaultZone } from "@/infra/delivery/nextDelivery";

/** "Today: Rosh Hashana — no deliveries · Next delivery in Tel Aviv: tomorrow 08:00–11:00, order by …" */
export async function DeliverySentence({ tone = "dark" }: { tone?: "dark" | "light" } = {}) {
  const info = await nextDeliveryForDefaultZone();
  if (!info) return null;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shop.home");
  const format = await getFormatter();
  const now = new Date();

  const dayWord = (d: Date) => {
    const iso = toIsoDate(israelDateOf(d));
    if (iso === toIsoDate(israelDateOf(now))) return t("today");
    if (iso === toIsoDate(israelDateOf(new Date(now.getTime() + 86_400_000)))) return t("tomorrow");
    return format.dateTime(d, { weekday: "long", day: "numeric", month: "numeric" });
  };
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const zone = locale === "he" ? info.zoneNameHe : info.zoneNameEn;

  return (
    <p className={`${tone === "dark" ? "text-bone-200" : "text-char-700"} flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm`}>
      <span aria-hidden className="bg-ok-600 size-2 rounded-full" />
      {info.todayClosed && <span>{t("todayClosed", { reason: locale === "he" ? info.todayClosed.he : info.todayClosed.en })}</span>}
      {info.next ? (
        <span>
          {t("nextDelivery", {
            zone,
            day: dayWord(info.next.startsAt),
            window: `${time(info.next.startsAt)}–${time(info.next.endsAt)}`,
            cutoffDay: dayWord(info.next.cutoffAt),
            cutoff: time(info.next.cutoffAt),
          })}
        </span>
      ) : (
        <span>{t("noDeliverySoon", { zone })}</span>
      )}
    </p>
  );
}
