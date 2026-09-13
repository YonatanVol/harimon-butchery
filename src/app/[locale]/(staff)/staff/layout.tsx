import { getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import { can, type StaffRole } from "@/domain/auth/permissions";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/infra/staff/session";
import { StaffNav } from "./StaffNav";

export default async function StaffLayout({ children, params }: LayoutProps<"/[locale]/staff">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const member = await requireStaff(locale);
  const t = await getTranslations("staff");

  return (
    <div className="bg-bone-100 min-h-dvh">
      <header className="bg-char-900 text-bone-50 sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <span className="font-bold">
            {brand.name[locale]} <span className="text-bone-300 font-normal">· {t("area")}</span>
          </span>
          <StaffNav
            labels={{ board: t("nav.board"), messages: t("nav.messages"), deliveries: t("nav.deliveries"), logout: t("nav.logout") }}
            member={{ name: locale === "he" ? member.fullNameHe : member.fullNameEn, role: t(`role.${member.role}`) }}
            canViewMessages={can(member.role as StaffRole, "VIEW_MESSAGES")}
          />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-3">
        {children}
      </main>
    </div>
  );
}
