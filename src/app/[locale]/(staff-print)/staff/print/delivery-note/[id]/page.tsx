import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { vatFromGross } from "@/domain/money/vat";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { loadPrintOrder } from "@/infra/staff/print";
import { requireStaff } from "@/infra/staff/session";
import { PrintToolbar } from "@/ui/staff/print/PrintToolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/print/delivery-note/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "staff.print" });
  const data = await loadPrintOrder(id);
  return { title: `${t("noteTitle")} ${data?.order.orderNumber ?? ""}`, robots: { index: false } };
}

type Address = { city?: string; street?: string; houseNumber?: string; apartment?: string | null; floor?: string | null };

/** What goes in the bag with the meat: final weights and prices, VAT, what was charged, and the kashrut statement. */
export default async function DeliveryNote({ params }: PageProps<"/[locale]/staff/print/delivery-note/[id]">) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  // Checked here as well as in the layout: a layout's check doesn't protect the page's own data.
  await requireStaff(locale, "VIEW_BOARD");
  const data = await loadPrintOrder(id);
  if (!data) notFound();
  const t = await getTranslations("staff.print");
  const format = await getFormatter();
  const { order: o, customer: c, slot, lines, invoice: inv, authorities } = data;
  const a = o.addressSnapshot as Address;
  const money = (v: number) => formatAgorot(agorot(v), locale);
  const g = (n: number) => formatGrams(grams(n), locale);

  const weighed = o.finalTotalAgorot !== null;
  const total = o.finalTotalAgorot ?? o.estimateTotalAgorot;
  const vat = inv ? { gross: inv.grossAgorot, vat: inv.vatAgorot, net: inv.netAgorot } : vatFromGross(agorot(total), o.vatRateBp);
  const fictional = authorities.some((x) => x.isFictional);

  return (
    <>
      <style>{`@page { size: A4; margin: 14mm; }`}</style>
      <PrintToolbar title={t("noteTitle")} backHref={`/staff/orders/${o.id}`} hint={weighed ? undefined : t("noteNotWeighed")} />
      <article className="mx-auto flex max-w-[182mm] flex-col gap-5 p-6 text-[10.5pt] print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-2xl font-bold">{brand.name[locale]}</p>
            <p className="text-sm">{brand.tagline[locale]}</p>
          </div>
          <div className="text-end">
            <h1 className="text-xl font-bold">{t("noteTitle")}</h1>
            <p className="tabular-nums">{t("order", { number: o.orderNumber })}</p>
            <p className="tabular-nums">{inv ? t("invoiceNumber", { number: inv.number }) : t("noInvoice")}</p>
            <p>{format.dateTime(inv?.issuedAt ?? o.createdAt, { day: "numeric", month: "numeric", year: "numeric" })}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold">{t("to")}</p>
            <p>
              {c.firstName} {c.lastName}
            </p>
            <p>
              {a.street} {a.houseNumber}
              {a.apartment ? `/${a.apartment}` : ""}, {a.city}
            </p>
          </div>
          {slot && (
            <div>
              <p className="text-sm font-semibold">{t("delivery")}</p>
              <p>{format.dateTime(slot.startsAt, { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</p>
            </div>
          )}
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-sm">
              <th className="py-1 text-start">{t("item")}</th>
              <th className="py-1 text-start">{t("requested")}</th>
              <th className="py-1 text-start">{t("actual")}</th>
              <th className="py-1 text-end">{t("unitPrice")}</th>
              <th className="py-1 text-end">{t("lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="break-inside-avoid border-b border-black/30">
                <td className="py-1.5 pe-2">
                  {locale === "he" ? l.productNameHe : l.productNameEn}
                  <span className="text-sm"> · {locale === "he" ? l.variantNameHe : l.variantNameEn}</span>
                </td>
                <td className="py-1.5 pe-2 tabular-nums">
                  <bdi>{l.pricingMode === "WEIGHT" ? g(l.estimatedG!) : `× ${l.quantity}`}</bdi>
                </td>
                <td className="py-1.5 pe-2 tabular-nums">
                  <bdi>
                    {l.status === "SHORT"
                      ? t("short")
                      : l.status === "SUBSTITUTED"
                        ? t("substituted")
                        : l.pricingMode === "WEIGHT"
                          ? l.actualG
                            ? g(l.actualG)
                            : "—"
                          : `× ${l.actualQuantity ?? l.quantity}`}
                  </bdi>
                </td>
                <td className="py-1.5 pe-2 text-end tabular-nums">
                  <bdi>{l.pricePerKgAgorot ? `${money(l.pricePerKgAgorot)} / ${t("kg")}` : money(l.estimateAgorot)}</bdi>
                </td>
                <td className="py-1.5 text-end tabular-nums">
                  <bdi>{l.status === "SUBSTITUTED" ? "—" : money(l.finalAgorot ?? l.estimateAgorot)}</bdi>
                </td>
              </tr>
            ))}
            <tr className="border-b border-black/30">
              <td className="py-1.5" colSpan={4}>
                {t("deliveryFee")}
              </td>
              <td className="py-1.5 text-end tabular-nums">
                <bdi>{money(o.deliveryFeeAgorot)}</bdi>
              </td>
            </tr>
          </tbody>
        </table>

        <dl className="ms-auto grid w-72 grid-cols-2 gap-y-1">
          <dt>{weighed ? t("totalFinal") : t("totalEstimate")}</dt>
          <dd className="text-end font-bold tabular-nums">
            <bdi>{money(vat.gross)}</bdi>
          </dd>
          <dt className="text-sm">{t("vatIncluded", { rate: o.vatRateBp / 100 })}</dt>
          <dd className="text-end text-sm tabular-nums">
            <bdi>{money(vat.vat)}</bdi>
          </dd>
          <dt className="text-sm">{t("beforeVat")}</dt>
          <dd className="text-end text-sm tabular-nums">
            <bdi>{money(vat.net)}</bdi>
          </dd>
          {o.goodwillAgorot > 0 && (
            <>
              <dt className="text-sm">{t("goodwill")}</dt>
              <dd className="text-end text-sm tabular-nums">
                <bdi>{money(o.goodwillAgorot)}</bdi>
              </dd>
            </>
          )}
          <dt className="border-t border-black pt-1">{t("charged")}</dt>
          <dd className="border-t border-black pt-1 text-end font-bold tabular-nums">
            <bdi>{o.capturedAgorot !== null ? money(o.capturedAgorot) : t("notCharged")}</bdi>
          </dd>
          {o.refundedAgorot > 0 && (
            <>
              <dt>{t("refunded")}</dt>
              <dd className="text-end tabular-nums">
                <bdi>{money(o.refundedAgorot)}</bdi>
              </dd>
            </>
          )}
        </dl>

        <section className="border-t-2 border-black pt-3 text-sm">
          <p className="font-semibold">{t("kashrutTitle")}</p>
          <p>
            {t("kashrutStatement", {
              authorities: authorities.map((x) => `${locale === "he" ? x.nameHe : x.nameEn} (${x.certificateNumber})`).join(", "),
            })}
          </p>
          {fictional && <p className="mt-1 font-semibold">{t("fictionalNotice")}</p>}
          <p className="mt-2">{t("keepColdLong")}</p>
          {brand.isDemo && <p className="mt-2 font-semibold">{t("demoNotice")}</p>}
        </section>
      </article>
    </>
  );
}
