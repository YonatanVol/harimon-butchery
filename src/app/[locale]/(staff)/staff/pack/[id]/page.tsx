import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can, type StaffRole } from "@/domain/auth/permissions";
import type { Locale } from "@/i18n/routing";
import { loadPackView } from "@/infra/orders/packView";
import { requireStaff } from "@/infra/staff/session";
import { PackStation } from "@/ui/staff/pack/PackStation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/staff/pack/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff.pack" });
  return { title: t("title"), robots: { index: false } };
}

export default async function PackPage({ params, searchParams }: PageProps<"/[locale]/staff/pack/[id]">) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const member = await requireStaff(raw as Locale, "PICK_AND_WEIGH");
  const view = await loadPackView(id);
  if (!view) notFound();
  const autoStart = (await searchParams).start === "1";
  return <PackStation initial={view} canCapture={can(member.role as StaffRole, "CAPTURE_PAYMENT")} autoStart={autoStart} />;
}
