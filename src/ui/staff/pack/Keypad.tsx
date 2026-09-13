"use client";

import { useTranslations } from "next-intl";
import { cx } from "../../cx";

/**
 * Grams only. There is deliberately no decimal key: "2.5" vs "25" is a mistake this screen
 * makes impossible. 88 px keys for wet or gloved hands; digits read left-to-right like any keypad.
 */
export function Keypad({
  value,
  onChange,
  disabled,
  requestedG,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  requestedG: number | null;
}) {
  const t = useTranslations("staff.pack");
  const press = (d: string) => {
    if (disabled) return;
    const next = (value + d).replace(/^0+/, "");
    if (next.length <= 5) onChange(next);
  };
  const nudge = (delta: number) => {
    const n = Math.max(0, (Number(value) || requestedG || 0) + delta);
    onChange(n ? String(n) : "");
  };
  const key = "bg-bone-50 ring-bone-300 active:bg-bone-200 grid size-[clamp(72px,10dvh,88px)] place-items-center rounded-2xl text-4xl font-semibold tabular-nums ring-1 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={disabled} onClick={() => nudge(-100)} className="bg-bone-200 min-h-12 rounded-xl text-lg font-medium disabled:opacity-40">
          {t("minus100")}
        </button>
        <button
          type="button"
          disabled={disabled || !requestedG}
          onClick={() => requestedG && onChange(String(requestedG))}
          className="bg-bone-200 min-h-12 rounded-xl text-lg font-medium disabled:opacity-40"
        >
          {t("exact")}
        </button>
        <button type="button" disabled={disabled} onClick={() => nudge(100)} className="bg-bone-200 min-h-12 rounded-xl text-lg font-medium disabled:opacity-40">
          {t("plus100")}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2" dir="ltr">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className={key}>
            {d}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={() => onChange("")} className={cx(key, "text-lg")}>
          {t("clear")}
        </button>
        <button type="button" disabled={disabled} onClick={() => press("0")} className={key}>
          0
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(value.slice(0, -1))} aria-label={t("delete")} className={key}>
          ⌫
        </button>
      </div>
    </div>
  );
}
