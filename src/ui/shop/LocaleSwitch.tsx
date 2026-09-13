"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Switches language on the same page, keeping the query string (e.g. a search). */
export function LocaleSwitch({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = locale === "he" ? "en" : "he";

  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={target}
      lang={target}
      aria-label={ariaLabel}
      className="hover:bg-bone-200 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium"
    >
      {label}
    </Link>
  );
}
