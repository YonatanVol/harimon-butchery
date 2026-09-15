"use client";

import { Children, type ReactNode, useRef, useState } from "react";
import { cx } from "../cx";

/**
 * Swipeable slides on phones (native scroll-snap, so it feels like the OS), with position dots that are
 * also buttons. A single slide renders without controls.
 */
export function ProductGallery({ children, labels, className }: { children: ReactNode; labels: string[]; className?: string }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== index) setIndex(Math.min(slides.length - 1, i));
  };

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: dir * i * el.clientWidth, behavior: "smooth" });
  };

  if (slides.length < 2) return <div className={className}>{slides}</div>;

  return (
    <div className={cx("relative", className)} role="region" aria-roledescription="carousel" aria-label={labels.join(" · ")}>
      <div
        ref={track}
        onScroll={onScroll}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length} · ${labels[i] ?? ""}`}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={labels[i]}
            aria-current={i === index || undefined}
            className="grid h-6 min-w-6 place-items-center"
          >
            <span
              className={cx(
                "block h-1.5 rounded-full shadow-[0_0_0_1px_#1b191622] transition-all duration-300",
                i === index ? "bg-bone-50 w-5" : "bg-bone-50/60 w-1.5",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
