import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AUDIT_GROUPS, type AuditGroup, loadAudit } from "@/infra/staff/audit";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/audit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.audit" });
  return { title: t("title"), robots: { index: false } };
}

type Json = Record<string, unknown> | null;
const num = (v: unknown) => (typeof v === "number" && Number.isSafeInteger(v) ? v : null);

export default async function AuditPage({ params, searchParams }: PageProps<"/[locale]/staff/audit">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  await requireStaff(locale, "VIEW_AUDIT");
  const sp = await searchParams;
  const t = await getTranslations("staff.audit");
  const format = await getFormatter();
  const group = (Object.keys(AUDIT_GROUPS) as AuditGroup[]).find((g) => g === sp.group) ?? null;
  const before = typeof sp.before === "string" && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : null;
  const { items, next } = await loadAudit({ group, before });

  const money = (v: unknown) => (num(v) === null ? "?" : formatAgorot(agorot(num(v)!), locale));
  // Isolated left-to-right, or "+6.1%" reads "6.1%+" inside a Hebrew sentence.
  const pct = (bp: unknown) => `\u2066${new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-IL", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" }).format((num(bp) ?? 0) / 10_000)}\u2069`;
  const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? format.dateTime(new Date(`${v}T12:00:00Z`), { weekday: "short", day: "numeric", month: "numeric" }) : "?");
  const qty = (v: unknown, unit: unknown) => (num(v) === null ? "?" : unit === "g" ? formatGrams(grams(num(v)!), locale) : t("units", { count: num(v)! }));

  function describe(e: (typeof items)[number]) {
    const b = e.before as Json;
    const a = e.after as Json;
    const productName = e.product ? (locale === "he" ? e.product.nameHe : e.product.nameEn) : t("deletedItem");
    const zoneName = e.zone ? (locale === "he" ? e.zone.nameHe : e.zone.nameEn) : t("deletedItem");
    switch (true) {
      case e.action === "product.price":
        return t("actions.price", { product: productName, before: money(b?.agorot), after: money(a?.agorot), pct: pct(a?.changeBp) });
      case e.action === "product.publish":
      case e.action === "product.unpublish":
        return t(e.action === "product.publish" ? "actions.publish" : "actions.unpublish", { product: productName });
      case e.action === "stock.restock_date":
        return t("actions.restockDate", { product: productName, date: a?.date ? day(a.date) : t("noDate") });
      case e.action.startsWith("stock."):
        return t(`actions.${e.action.replace("stock.", "stock_") as "stock_received" | "stock_spoilage" | "stock_count_correction"}`, { product: productName, before: qty(b?.onHand, b?.unit), after: qty(a?.onHand, a?.unit) });
      case e.action === "zone.update":
        return t("actions.zone", { zone: zoneName });
      case e.action === "blackout.add":
        return t("actions.blackoutAdd", { date: day(a?.date), reason: String(a?.reasonHe ?? "") });
      case e.action === "blackout.remove":
        return t("actions.blackoutRemove", { date: day(b?.date), reason: String(b?.reasonHe ?? "") });
      case e.action === "slots.generate":
        return t("actions.slots", { added: num(a?.added) ?? 0, closing: num(a?.closing) ?? 0 });
      case e.action === "order.change_window":
        return t("actions.changeWindow", { order: e.order?.number ?? "?" });
      case ["order.start_picking", "order.ask_customer", "order.packed", "capture.succeeded", "capture.retry", "capture.reconcile", "payment.late_payment_returned", "payment.late_payment_not_returned"].includes(e.action):
        return t(`actions.${e.action.replace(/\./g, "_") as "order_packed"}`, { order: e.order?.number ?? "?", amount: num(a?.amountAgorot) !== null ? money(a?.amountAgorot) : "" });
      case e.action.startsWith("line."):
        return t(`actions.${e.action.replace(".", "_") as "line_weigh"}`, { order: e.order?.number ?? "?", weight: num(a?.actualG) !== null ? qty(a?.actualG, "g") : "", name: String((locale === "he" ? a?.substituteNameHe : a?.substituteNameEn) ?? "") });
      case e.action.startsWith("delivery."):
        return t("actions.delivery", { order: e.order?.number ?? "?", event: t(`deliveryEvents.${e.action.replace("delivery.", "").toUpperCase() as "DELIVERED"}`) });
      case e.action.startsWith("review."):
        return t(`actions.${e.action.replace(".", "_") as "review_publish"}`);
      case e.action === "GIVE_EXTRA_FREE":
        return t("actions.giveFree", { order: e.order?.number ?? "?", amount: money(a?.goodwillAgorot) });
      case e.entityType === "order":
        return t("actions.orderEvent", { order: e.order?.number ?? "?", event: t(`events.${e.action as "REFUND_REQUESTED"}`), amount: num(a?.amountAgorot) !== null ? money(a?.amountAgorot) : "" });
      default:
        return `${e.action} · ${e.entityType}`;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-char-700">{t("intro")}</p>
      </header>
      <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
        {[null, ...(Object.keys(AUDIT_GROUPS) as AuditGroup[])].map((g) => (
          <Link
            key={g ?? "all"}
            href={g ? `/staff/audit?group=${g}` : "/staff/audit"}
            aria-current={g === group ? "page" : undefined}
            className={cx("inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ring-1", g === group ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300")}
          >
            {t(`groups.${g ?? "all"}`)}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="bg-bone-50 text-char-700 rounded-2xl p-8 text-center text-lg">{t("empty")}</p>
      ) : (
        <ol className="bg-bone-50 ring-bone-300 divide-bone-200 flex flex-col divide-y rounded-2xl ring-1">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {e.order ? (
                    <Link href={`/staff/orders/${e.order.id}`} className="underline-offset-4 hover:underline">
                      {describe(e)}
                    </Link>
                  ) : (
                    describe(e)
                  )}
                </p>
                {e.reason && <p className="text-char-700 text-sm">“{e.reason}”</p>}
              </div>
              <p className="text-char-500 text-sm">
                {e.actorType === "STAFF" ? (locale === "he" ? e.staffHe : e.staffEn) ?? t("unknownStaff") : t(`actors.${e.actorType as "SYSTEM"}`)} ·{" "}
                <bdi dir="ltr" className="tabular-nums">
                  {format.dateTime(e.createdAt, { day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                </bdi>
              </p>
            </li>
          ))}
        </ol>
      )}
      {next && (
        <Link href={`/staff/audit?${new URLSearchParams({ ...(group ? { group } : {}), before: next.toISOString() })}`} className="bg-bone-50 ring-bone-300 inline-flex min-h-11 w-fit items-center rounded-lg px-4 font-medium ring-1">
          {t("older")}
        </Link>
      )}
    </div>
  );
}
