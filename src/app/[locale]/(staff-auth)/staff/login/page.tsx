import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { staffUser } from "@/infra/db/schema";
import { currentStaff } from "@/infra/staff/session";
import { StaffLogin } from "./StaffLogin";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.login" });
  return { title: t("title"), robots: { index: false } };
}

export default async function StaffLoginPage({ params }: PageProps<"/[locale]/staff/login">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  if (await currentStaff()) redirect(`/${locale}/staff`);
  const t = await getTranslations("staff");
  const members = await db
    .select({ id: staffUser.id, nameHe: staffUser.fullNameHe, nameEn: staffUser.fullNameEn, role: staffUser.role })
    .from(staffUser)
    .where(eq(staffUser.active, true))
    .orderBy(asc(staffUser.createdAt));

  return (
    <main className="bg-char-900 text-bone-50 min-h-dvh px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-1">
          <p className="text-bone-300 text-sm">{brand.name[locale]} · {t("area")}</p>
          <h1 className="text-4xl font-bold">{t("login.title")}</h1>
        </header>
        {brand.isDemo && (
          <p role="note" className="bg-warn-600/20 text-bone-50 rounded-xl px-4 py-3 font-medium">
            {t("login.demoPin")}
          </p>
        )}
        <StaffLogin
          members={members.map((m) => ({ id: m.id, name: locale === "he" ? m.nameHe : m.nameEn, role: t(`role.${m.role}`) }))}
        />
      </div>
    </main>
  );
}
