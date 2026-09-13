"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

/** A tablet-sized dialog. Esc closes it; focus moves into it when it opens. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="bg-char-900/60 fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        className="bg-bone-50 flex max-h-[90dvh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-3xl p-6 shadow-2xl"
      >
        <h2 id={id} className="text-2xl font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
