import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can, type StaffRole } from "@/domain/auth/permissions";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { loadCatalogAdmin } from "@/infra/catalog/admin";
import { db } from "@/infra/db/client";
import { requireStaff } from "@/infra/staff/session";
import { cx } from "@/ui/cx";
import { Badge } from "@/ui/primitives/Badge";
import { PriceEditor, PublishToggle } from "@/ui/staff/CatalogTools";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/catalog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.catalog" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CatalogPage({ params }: PageProps<"/[locale]/staff/catalog">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const member = await requireStaff(locale, "EDIT_CATALOG");
  const canPrice = can(member.role as StaffRole, "EDIT_PRICES");
  const t = await getTranslations("staff.catalog");
  const rows = await loadCatalogAdmin(db);
  const hidden = rows.filter((r) => !r.published).length;
  const blocked = rows.filter((r) => r.flags.noKashrut || r.flags.certificateExpired).length;
  const noPhoto = rows.filter((r) => r.flags.noPhoto).length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-char-700">{t("summary", { total: rows.length, hidden, blocked, noPhoto })}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-char-500 text-xs">
            <tr className="border-bone-300 border-b">
              <th className="py-2 text-start font-medium">{t("product")}</th>
              <th className="py-2 text-start font-medium">{t("kashrut")}</th>
              <th className="py-2 text-start font-medium">{t("attention")}</th>
              <th className="py-2 text-end font-medium">{t("price")}</th>
              <th className="py-2 text-end font-medium">{t("onSite")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cannotPublish = r.flags.noKashrut ? t("problems.NO_KASHRUT") : r.flags.certificateExpired ? t("problems.CERTIFICATE_EXPIRED_SHORT") : null;
              return (
                <tr key={r.id} className={cx("border-bone-200 border-b align-top", !r.published && "bg-bone-100")}>
                  <td className="py-3">
                    <Link href={`/p/${r.slug}`} className="font-semibold underline-offset-4 hover:underline">
                      {locale === "he" ? r.nameHe : r.nameEn}
                    </Link>
                    <div className="text-char-500 text-xs">{locale === "he" ? r.categoryHe : r.categoryEn}</div>
                  </td>
                  <td className="py-3 text-xs">{r.authorityHe ? (locale === "he" ? r.authorityHe : r.authorityEn) : "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.flags.noKashrut && <Badge tone="bad">{t("flags.noKashrut")}</Badge>}
                      {r.flags.certificateExpired && <Badge tone="bad">{t("flags.certificateExpired")}</Badge>}
                      {r.flags.noPhoto && <Badge tone="warn">{t("flags.noPhoto")}</Badge>}
                    </div>
                  </td>
                  <td className="py-3 text-end">
                    <div className="font-semibold tabular-nums">
                      <bdi>{formatAgorot(agorot(r.price), locale)}</bdi>
                      <span className="text-char-500 text-xs font-normal"> {r.pricingMode === "WEIGHT" ? t("perKg") : t("perPackage")}</span>
                    </div>
                    <PriceEditor productId={r.id} name={locale === "he" ? r.nameHe : r.nameEn} current={r.price} perKg={r.pricingMode === "WEIGHT"} blockedReason={canPrice ? null : t("problems.NOT_PERMITTED_PRICE")} />
                  </td>
                  <td className="py-3 text-end">
                    <PublishToggle productId={r.id} published={r.published} cannotPublish={cannotPublish} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
