import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";
import { loadPrintOrder } from "@/infra/staff/print";
import { requireStaff } from "@/infra/staff/session";
import { Barcode } from "@/ui/staff/print/Barcode";
import { PrintToolbar } from "@/ui/staff/print/PrintToolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/print/label/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "staff.print" });
  const data = await loadPrintOrder(id);
  return { title: `${t("labelTitle")} ${data?.order.orderNumber ?? ""}`, robots: { index: false } };
}

type Address = { city?: string; street?: string; houseNumber?: string; entrance?: string | null; floor?: string | null; apartment?: string | null; intercom?: string | null; deliveryNotes?: string | null };

/** A 100 × 150 mm label for the insulated bag: who, where, when, and "keep cold". */
export default async function PackageLabel({ params }: PageProps<"/[locale]/staff/print/label/[id]">) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  // Checked here as well as in the layout: a layout's check doesn't protect the page's own data.
  await requireStaff(locale, "VIEW_BOARD");
  const data = await loadPrintOrder(id);
  if (!data) notFound();
  const t = await getTranslations("staff.print");
  const checkout = await getTranslations("checkout");
  const format = await getFormatter();
  const { order: o, customer: c, slot, zone, lines } = data;
  const a = o.addressSnapshot as Address;
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const details = [a.entrance && `${checkout("entrance")} ${a.entrance}`, a.floor && `${checkout("floor")} ${a.floor}`, a.apartment && `${checkout("apartment")} ${a.apartment}`, a.intercom && `${t("intercom")} ${a.intercom}`].filter(Boolean);

  return (
    <>
      <style>{`@page { size: 100mm 150mm; margin: 4mm; }`}</style>
      <PrintToolbar title={t("labelTitle")} backHref={`/staff/orders/${o.id}`} hint={t("labelHint")} />
      <div className="grid place-items-center p-6 print:block print:p-0">
        <article className="flex h-[142mm] w-[92mm] flex-col gap-2 border-2 border-black p-3 print:border-0">
          <div className="flex items-center justify-between text-xs">
            <span>{brand.name[locale]}</span>
            <span>{t("items", { count: lines.length })}</span>
          </div>
          <p className="text-center text-4xl font-black tabular-nums">{o.orderNumber}</p>
          <Barcode value={o.orderNumber} height={48} module={2} className="mx-auto" />
          <div className="border-y-2 border-black py-2">
            <p className="text-2xl font-bold leading-tight">
              {c.firstName} {c.lastName}
            </p>
            <p className="text-xl leading-tight">
              {a.street} {a.houseNumber}, {a.city}
            </p>
            {details.length > 0 && <p className="text-base">{details.join(" · ")}</p>}
            <p className="text-lg tabular-nums">
              <bdi dir="ltr">{c.phoneE164.replace(/^\+972/, "0")}</bdi>
            </p>
            {a.deliveryNotes && <p className="text-sm font-semibold">“{a.deliveryNotes}”</p>}
          </div>
          {slot && (
            <p className="text-lg font-bold">
              {format.dateTime(slot.startsAt, { weekday: "long", day: "numeric", month: "numeric" })}{" "}
              <bdi dir="ltr">
                {time(slot.startsAt)}–{time(slot.endsAt)}
              </bdi>
              <span className="block text-base font-normal">{locale === "he" ? zone.nameHe : zone.nameEn}</span>
            </p>
          )}
          <p className="mt-auto border-2 border-black p-2 text-center text-xl font-black">{t("keepCold")}</p>
          <p className="text-center text-sm">{t("bagOf")}</p>
        </article>
      </div>
    </>
  );
}
