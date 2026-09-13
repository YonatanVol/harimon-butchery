import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { loadPrintOrder } from "@/infra/staff/print";
import { requireStaff } from "@/infra/staff/session";
import { Barcode } from "@/ui/staff/print/Barcode";
import { PrintToolbar } from "@/ui/staff/print/PrintToolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/print/pick/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "staff.print" });
  const data = await loadPrintOrder(id);
  return { title: `${t("pickTitle")} ${data?.order.orderNumber ?? ""}`, robots: { index: false } };
}

export default async function PickSheet({ params }: PageProps<"/[locale]/staff/print/pick/[id]">) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  // Checked here as well as in the layout: a layout's check doesn't protect the page's own data.
  await requireStaff(locale, "VIEW_BOARD");
  const data = await loadPrintOrder(id);
  if (!data) notFound();
  const t = await getTranslations("staff.print");
  const flagT = await getTranslations("shop.flags");
  const format = await getFormatter();
  const { order: o, customer: c, slot, zone, lines } = data;
  const g = (n: number) => formatGrams(grams(n), locale);
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  return (
    <>
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <PrintToolbar title={t("pickTitle")} backHref={`/staff/orders/${o.id}`} hint={t("pickHint")} />
      <article className="mx-auto flex max-w-[190mm] flex-col gap-5 p-6 text-[11pt] print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-sm">{brand.name[locale]} · {t("pickTitle")}</p>
            <h1 className="text-3xl font-bold tabular-nums">{o.orderNumber}</h1>
            <p className="text-lg font-semibold">
              {c.firstName} {c.lastName}
            </p>
            {slot && (
              <p>
                {format.dateTime(slot.startsAt, { weekday: "long", day: "numeric", month: "numeric" })}{" "}
                <bdi dir="ltr">
                  {time(slot.startsAt)}–{time(slot.endsAt)}
                </bdi>{" "}
                · {locale === "he" ? zone.nameHe : zone.nameEn}
              </p>
            )}
          </div>
          <Barcode value={o.orderNumber} />
        </header>

        {o.customerNote && (
          <p className="border-2 border-black p-2 font-semibold">
            {t("orderNote")}: {o.customerNote}
          </p>
        )}

        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="border-b-2 border-black text-sm">
              <th className="py-1 text-start">#</th>
              <th className="py-1 text-start">{t("item")}</th>
              <th className="py-1 text-start">{t("requested")}</th>
              <th className="py-1 text-start">{t("range")}</th>
              <th className="py-1 text-start">{t("actual")}</th>
              <th className="py-1 text-center">✓</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="break-inside-avoid border-b border-black/40 align-top">
                <td className="py-2 pe-2 tabular-nums">{i + 1}</td>
                <td className="py-2 pe-2">
                  <div className="font-bold">{locale === "he" ? l.productNameHe : l.productNameEn}</div>
                  <div>{locale === "he" ? (l.cutInstructionHe ?? l.variantNameHe) : (l.cutInstructionEn ?? l.variantNameEn)}</div>
                  {l.customerNote && <div className="font-semibold">★ {l.customerNote}</div>}
                  {l.handlingFlags.filter((f) => f === "REQUIRES_BROILING_TZLIYA" || f === "REQUIRES_SALTING").map((f) => (
                    <div key={f} className="font-semibold">⚠ {flagT(f)}</div>
                  ))}
                  <div className="text-sm">{l.allowSubstitute ? t("substituteOk") : t("noSubstitute")}</div>
                </td>
                <td className="py-2 pe-2 text-lg font-bold tabular-nums">
                  <bdi>{l.pricingMode === "WEIGHT" ? g(l.estimatedG!) : `× ${l.quantity}`}</bdi>
                </td>
                <td className="py-2 pe-2 tabular-nums">
                  {l.toleranceMinG && l.toleranceMaxG ? (
                    <bdi>
                      {g(l.toleranceMinG)}–{g(l.toleranceMaxG)}
                    </bdi>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pe-2">
                  <div className="h-10 w-28 border-2 border-black" aria-label={t("actual")} />
                </td>
                <td className="py-2 text-center">
                  <div className="mx-auto size-8 border-2 border-black" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <p>{t("pickedBy")}: ______________________</p>
          <p>{t("checkedBy")}: ______________________</p>
        </footer>
      </article>
    </>
  );
}
