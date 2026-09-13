import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/infra/staff/session";

/** Printouts: no staff navigation, white paper, the browser's print dialog does the rest. */
export default async function PrintLayout({ children, params }: LayoutProps<"/[locale]/staff/print">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale, "VIEW_BOARD");
  return <div className="min-h-dvh bg-white text-black print:min-h-0">{children}</div>;
}
