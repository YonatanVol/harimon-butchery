"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/brand";

/**
 * "Ask the butcher" — opens WhatsApp with the cut and the page already written in.
 * This shop is a demo with no real WhatsApp number, so instead of opening a chat that goes nowhere it shows the
 * exact message that would be sent, and says why.
 */
export function AskButcher({ productName, productUrl }: { productName: string; productUrl: string }) {
  const t = useTranslations("shop.ask");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const message = t("message", { name: productName, url: productUrl });

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!brand.isDemo && brand.whatsappE164) {
    return (
      <a
        href={`https://wa.me/${brand.whatsappE164.replace("+", "")}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border-char-900 hover:bg-char-900 hover:text-bone-50 inline-flex min-h-12 items-center gap-2 border px-5 text-[15px] font-semibold transition-colors"
      >
        <WhatsAppMark />
        {t("cta")}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-char-900 hover:bg-char-900 hover:text-bone-50 inline-flex min-h-12 items-center gap-2 border px-5 text-[15px] font-semibold transition-colors"
      >
        <WhatsAppMark />
        {t("cta")}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="bg-bone-50 text-char-900 m-auto w-[min(32rem,calc(100vw-2rem))] p-0 backdrop:bg-[#1b1916aa]"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="font-display text-2xl">{t("demoTitle")}</h2>
          <p className="text-char-700 leading-relaxed">{t("demoBody")}</p>
          <blockquote className="bg-bone-100 border-brass-500 border-s-2 p-4 text-sm leading-relaxed whitespace-pre-line">{message}</blockquote>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-char-900 text-bone-50 min-h-12 self-start px-6 text-[15px] font-semibold"
          >
            {t("close")}
          </button>
        </div>
      </dialog>
    </>
  );
}

const WhatsAppMark = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.87 9.87 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.39c0-4.53 3.7-8.22 8.24-8.22 2.2 0 4.27.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.23 8.24Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06a6.7 6.7 0 0 1-3.33-2.91c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.42-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43l-.48-.01c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64 1.53.66 2.13.72 2.9.6.46-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.15-1.18-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);
