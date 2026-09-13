import type { Metadata } from "next";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { notification, order } from "@/infra/db/schema";
import { activeNotifier } from "@/infra/notify/providers";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { ResendButton } from "./ResendButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/messages">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.messages" });
  return { title: t("title"), robots: { index: false } };
}

const STATUSES = ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED", "SUPPRESSED"] as const;

export default async function MessagesPage({ params, searchParams }: PageProps<"/[locale]/staff/messages">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  await requireStaff(locale, "VIEW_MESSAGES");
  const sp = await searchParams;
  const t = await getTranslations("staff.messages");
  const format = await getFormatter();
  const notifier = activeNotifier();

  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const status = STATUSES.find((s) => s === sp.status) ?? null;
  const filters: SQL[] = [];
  if (status) filters.push(eq(notification.status, status));
  if (q) filters.push(ilike(order.orderNumber, `%${q.replace(/[%_]/g, "")}%`));

  const rows = await db
    .select({ n: notification, orderNumber: order.orderNumber, orderId: order.id })
    .from(notification)
    .leftJoin(order, eq(order.id, notification.orderId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(notification.queuedAt))
    .limit(200);

  const time = (d: Date | null) => (d ? format.dateTime(d, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : null);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p role="note" className={cx("rounded-xl p-4 font-medium", notifier.demo ? "bg-warn-600/10 text-warn-600" : "bg-ok-600/10 text-ok-600")}>
        {notifier.demo ? t("demoBanner") : t("liveBanner", { provider: notifier.name })}
      </p>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-sm">
          {t("searchOrder")}
          <input name="q" defaultValue={q} dir="ltr" className="bg-bone-50 min-h-12 rounded-lg border border-bone-300 px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("status")}
          <select name="status" defaultValue={status ?? ""} className="bg-bone-50 min-h-12 rounded-lg border border-bone-300 px-3">
            <option value="">{t("all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-char-900 text-bone-50 min-h-12 rounded-lg px-5 font-medium">
          {t("filter")}
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="bg-bone-50 text-char-700 rounded-2xl p-8 text-center">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map(({ n, orderNumber, orderId }) => (
            <li key={n.id} className="bg-bone-50 ring-bone-300 flex flex-col gap-2 rounded-2xl p-4 ring-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={n.status === "FAILED" ? "bad" : n.status === "SUPPRESSED" ? "warn" : n.status === "QUEUED" ? "neutral" : "ok"}>{t(`statuses.${n.status}`)}</Badge>
                <Badge>{n.channel}</Badge>
                <Badge tone={n.provider === "MOCK" ? "warn" : "neutral"}>{n.provider === "MOCK" ? t("providerDemo") : n.provider}</Badge>
                <span className="text-char-500">{t(`templates.${n.templateKey.replace(".", "_")}` as never)}</span>
                {orderNumber && (
                  <Link href={`/staff/orders/${orderId}`} className="text-wine-600 tabular-nums underline-offset-4 hover:underline">
                    {orderNumber}
                  </Link>
                )}
                <bdi dir="ltr" className="text-char-500 ms-auto tabular-nums">
                  {n.toE164}
                </bdi>
              </div>
              <p className="bg-bone-100 rounded-xl p-3 text-sm whitespace-pre-line" dir={n.locale === "he" ? "rtl" : "ltr"}>
                {n.renderedBody}
              </p>
              <div className="text-char-500 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                <span>{t("queuedAt", { time: time(n.queuedAt)! })}</span>
                {n.sentAt && <span>{t("sentAt", { time: time(n.sentAt)! })}</span>}
                {n.deliveredAt && <span>{t("deliveredAt", { time: time(n.deliveredAt)! })}</span>}
                {n.readAt && <span>{t("readAt", { time: time(n.readAt)! })}</span>}
                {n.failureReason && <span className="text-bad-600">{t("reason", { reason: n.failureReason })}</span>}
                {n.status === "FAILED" && <ResendButton id={n.id} label={t("resend")} pendingLabel={t("resending")} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
