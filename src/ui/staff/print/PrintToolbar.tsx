"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** On screen only: what this is, a print button, and the way back. Hidden on paper. */
export function PrintToolbar({ title, backHref, hint }: { title: string; backHref: string; hint?: string }) {
  const t = useTranslations("staff.print");
  return (
    <div className="bg-char-900 text-bone-50 flex flex-wrap items-center gap-3 px-4 py-3 print:hidden">
      <Link href={backHref} className="ring-bone-50/30 inline-flex min-h-11 items-center rounded-lg px-3 text-sm ring-1">
        {t("back")}
      </Link>
      <span className="font-semibold">{title}</span>
      {hint && <span className="text-bone-300 text-sm">{hint}</span>}
      <button type="button" onClick={() => window.print()} className="bg-bone-50 text-char-900 ms-auto inline-flex min-h-11 items-center rounded-lg px-5 font-semibold">
        {t("print")}
      </button>
    </div>
  );
}
