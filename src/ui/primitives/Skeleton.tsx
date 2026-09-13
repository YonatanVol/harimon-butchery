import { cx } from "../cx";

/** A placeholder shaped like the content it replaces. Never a spinner over a blank page. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("bg-bone-200 block animate-pulse rounded-md", className)} />;
}
