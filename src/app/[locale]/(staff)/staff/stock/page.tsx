import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { requireStaff } from "@/infra/staff/session";
import { loadStockView } from "@/infra/stock/stock";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { StockEditor } from "@/ui/staff/StockEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/stock">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.stock" });
  return { title: t("title"), robots: { index: false } };
}

export default async function StockPage({ params }: PageProps<"/[locale]/staff/stock">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  await requireStaff(locale, "MANAGE_STOCK");
  const t = await getTranslations("staff.stock");
  const format = await getFormatter();
  const rows = await loadStockView(db);
  const qty = (weight: boolean, n: number) => (weight ? formatGrams(grams(n), locale) : t("units", { count: n }));
  const signed = (weight: boolean, delta: number) => `${delta < 0 ? "−" : "+"}${qty(weight, Math.abs(delta))}`;
  const attention = rows.filter((r) => r.state !== "IN_STOCK").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-char-700">{attention ? t("attention", { count: attention }) : t("allGood")}</p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-char-500 text-xs">
            <tr className="border-bone-300 border-b">
              <th className="py-2 text-start font-medium">{t("product")}</th>
              <th className="py-2 text-start font-medium">{t("state")}</th>
              <th className="py-2 text-end font-medium">{t("onHand")}</th>
              <th className="py-2 text-end font-medium">{t("reserved")}</th>
              <th className="py-2 text-end font-medium">{t("available")}</th>
              <th className="py-2 text-end font-medium">{t("threshold")}</th>
              <th className="py-2 ps-4 text-start font-medium">{t("lastMovement")}</th>
              <th className="py-2 text-end font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className={cx("border-bone-200 border-b align-top", r.state === "OUT" && "bg-bad-600/5", r.state === "LOW" && "bg-warn-600/5")}>
                <td className="py-3">
                  <div className="font-semibold">{locale === "he" ? r.nameHe : r.nameEn}</div>
                  <div className="text-char-500 text-xs">
                    {locale === "he" ? r.categoryHe : r.categoryEn}
                    {!r.published && ` · ${t("unpublished")}`}
                  </div>
                  {r.waiting > 0 && <div className="text-wine-700 text-xs font-medium">{t("waiting", { count: r.waiting })}</div>}
                </td>
                <td className="py-3">
                  <Badge tone={r.state === "OUT" ? "bad" : r.state === "LOW" ? "warn" : "ok"}>{t(`states.${r.state}`)}</Badge>
                  {r.stock.nextRestockDate && r.state === "OUT" && (
                    <div className="text-char-500 mt-1 text-xs">{t("restockOn", { date: format.dateTime(new Date(`${r.stock.nextRestockDate}T12:00:00Z`), { weekday: "short", day: "numeric", month: "numeric" }) })}</div>
                  )}
                </td>
                <td className="py-3 text-end tabular-nums"><bdi>{qty(r.weight, r.onHand)}</bdi></td>
                <td className="text-char-700 py-3 text-end tabular-nums"><bdi>{qty(r.weight, r.reserved)}</bdi></td>
                <td className="py-3 text-end font-semibold tabular-nums"><bdi>{qty(r.weight, r.available)}</bdi></td>
                <td className="text-char-500 py-3 text-end tabular-nums"><bdi>{qty(r.weight, r.threshold)}</bdi></td>
                <td className="text-char-700 py-3 ps-4 text-xs">
                  {r.lastMovement ? (
                    <>
                      {t(`reasons.${r.lastMovement.reason}`)}{" "}
                      <bdi dir="ltr" className="tabular-nums">{signed(r.weight, r.weight ? r.lastMovement.deltaG : r.lastMovement.deltaUnits)}</bdi>
                      <div className="text-char-500">
                        {format.dateTime(r.lastMovement.createdAt, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                        {r.lastMovement.staffHe && ` · ${locale === "he" ? r.lastMovement.staffHe : r.lastMovement.staffEn}`}
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 text-end">
                  <StockEditor productId={r.productId} name={locale === "he" ? r.nameHe : r.nameEn} weight={r.weight} onHand={r.onHand} reserved={r.reserved} restockDate={r.stock.nextRestockDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
