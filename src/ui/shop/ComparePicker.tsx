"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export interface PickerGroup {
  label: string;
  items: Array<{ slug: string; name: string }>;
}

/**
 * Choosing which cuts to line up. The choice lives in the address, so a comparison can be sent to
 * someone or kept open in a tab — and the page works with JavaScript off, since the form submits.
 */
export function ComparePicker({ slots, groups, labels }: { slots: Array<string | null>; groups: PickerGroup[]; labels: string[] }) {
  const t = useTranslations("shop.compare");
  const router = useRouter();

  const change = (index: number, slug: string) => {
    const next = slots.map((s, i) => (i === index ? slug || null : s));
    const query = next.filter(Boolean).join(",");
    router.replace(query ? `/compare?cuts=${query}` : "/compare");
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {slots.map((slot, i) => (
        <label key={labels[i]} className="flex flex-col gap-1 text-sm">
          <span className="text-char-500">{labels[i]}</span>
          <select
            value={slot ?? ""}
            onChange={(e) => change(i, e.target.value)}
            className="bg-bone-50 border-bone-300 focus:ring-wine-600 min-h-12 rounded-[2px] border px-3 outline-none focus:ring-2"
          >
            <option value="">{t("pick")}</option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
