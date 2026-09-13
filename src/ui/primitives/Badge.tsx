import type { ReactNode } from "react";
import { cx } from "../cx";

const tones = {
  neutral: "bg-bone-200 text-char-800",
  wine: "bg-wine-600/10 text-wine-700 ring-wine-600/25",
  ok: "bg-ok-600/10 text-ok-600 ring-ok-600/25",
  warn: "bg-warn-600/10 text-warn-600 ring-warn-600/25",
  bad: "bg-bad-600/10 text-bad-600 ring-bad-600/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
