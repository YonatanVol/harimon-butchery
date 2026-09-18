import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReviewStatus } from "@/domain/catalog/reviews";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { countPending, listForModeration } from "@/infra/reviews/repository";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { RatingStars } from "@/ui/shop/reviews/Stars";
import { ModerationButtons, ReplyBox } from "./ReviewTools";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/reviews">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.reviews" });
  return { title: t("title"), robots: { index: false } };
}

const STATUSES = ["PENDING", "PUBLISHED", "REJECTED"] as const satisfies readonly ReviewStatus[];
/** One screen's worth. The banner above the list says so when there are more than this. */
const PAGE = 100;

export default async function StaffReviewsPage({ params, searchParams }: PageProps<"/[locale]/staff/reviews">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  await requireStaff(locale, "MODERATE_REVIEWS");
  const sp = await searchParams;
  const t = await getTranslations("staff.reviews");
  const format = await getFormatter();

  const status = STATUSES.find((s) => s === sp.status) ?? "PENDING";
  const [rows, pending] = await Promise.all([listForModeration(db, status, PAGE), countPending(db)]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-char-700">{t("intro")}</p>
      </header>

      <p role="note" className={cx("rounded-xl p-3 font-medium", pending > 0 ? "bg-warn-600/10 text-warn-600" : "bg-ok-600/10 text-ok-600")}>
        {pending > 0 ? t("waiting", { count: pending }) : t("allDone")}
      </p>

      <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/staff/reviews?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={cx("inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ring-1", s === status ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300")}
          >
            {t(`statuses.${s}`)}
          </Link>
        ))}
      </nav>

      {rows.length >= PAGE && <p className="text-char-700 text-sm">{t("showingFirst", { count: PAGE })}</p>}

      {rows.length === 0 ? (
        <p className="bg-bone-50 text-char-700 rounded-2xl p-8 text-center text-lg">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="bg-bone-50 ring-bone-300 flex flex-col gap-3 rounded-2xl p-5 ring-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingStars rating={r.rating} label={t("stars", { count: r.rating })} size="sm" />
                <Link href={`/p/${r.productSlug}`} className="text-lg font-semibold underline-offset-4 hover:underline">
                  {locale === "he" ? r.productNameHe : r.productNameEn}
                </Link>
                <Badge tone={r.status === "PUBLISHED" ? "ok" : r.status === "REJECTED" ? "neutral" : "warn"}>{t(`statuses.${r.status}`)}</Badge>
                <span className="text-char-500 text-sm">
                  {r.displayName} · {t("onOrder", { order: r.orderNumber })} ·{" "}
                  <bdi dir="ltr" className="tabular-nums">
                    {format.dateTime(r.createdAt, { day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                  </bdi>
                </span>
              </div>

              <p className="text-[17px] leading-relaxed whitespace-pre-line" lang={r.locale} dir="auto">
                {r.body}
              </p>

              {r.moderationNote && <p className="text-char-500 text-sm">{t("rejectedNote", { note: r.moderationNote })}</p>}

              <ModerationButtons id={r.id} status={r.status} />
              <ReplyBox id={r.id} current={r.replyBody} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
