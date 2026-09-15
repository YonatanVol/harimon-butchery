"use client";

import { type ButtonHTMLAttributes, type ReactNode, useId } from "react";
import { cx } from "../cx";

/**
 * There is no `disabled` prop. A button is disabled by giving the reason it is disabled, and the
 * reason is always shown as visible text beneath it (tablets have no hover, so no tooltips).
 */
type NativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "children">;

export interface ButtonProps extends NativeProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg" | "xl";
  /** When set, the button is disabled and this sentence explains why. */
  disabledReason?: string | null;
  /** Shows a busy state; the label should say what is happening ("שומר…"). */
  pendingLabel?: string | null;
  fullWidth?: boolean;
}

const variants = {
  primary: "bg-char-900 text-bone-50 hover:bg-char-800 active:bg-char-700",
  secondary: "bg-transparent text-char-900 ring-1 ring-inset ring-char-900/30 hover:ring-char-900",
  ghost: "text-char-900 hover:bg-bone-200/60",
  danger: "bg-bad-600 text-bone-50 hover:brightness-95",
};

const sizes = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-16 px-6 text-lg",
  xl: "min-h-22 px-8 text-2xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabledReason,
  pendingLabel,
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const disabled = Boolean(disabledReason) || Boolean(pendingLabel);

  return (
    <span className={cx("inline-flex flex-col gap-1", fullWidth && "w-full")}>
      <button
        {...rest}
        type={type}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        aria-busy={pendingLabel ? true : undefined}
        aria-describedby={disabledReason ? reasonId : undefined}
        className={cx(
          "inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition-colors",
          "focus-visible:outline-wine-500 focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed",
          sizes[size],
          disabledReason
            ? "bg-bone-200 text-char-500 ring-1 ring-inset ring-bone-300"
            : variants[variant],
          fullWidth && "w-full",
          className,
        )}
      >
        {pendingLabel ? (
          <>
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            {pendingLabel}
          </>
        ) : (
          // One inline run, so mixed text and <Money> wrap as a sentence, not as separate flex items.
          <span className="min-w-0 text-balance">{children}</span>
        )}
      </button>
      {disabledReason && (
        <span id={reasonId} className="text-char-700 text-sm" data-disabled-reason>
          {disabledReason}
        </span>
      )}
    </span>
  );
}
