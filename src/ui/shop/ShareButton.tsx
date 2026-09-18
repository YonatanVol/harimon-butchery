"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Share a cut or a recipe. On a phone this opens the system sheet — WhatsApp, Messages, anything the
 * person already uses. On a desktop browser without that sheet it copies the link and says so, and if
 * even that is refused it shows the address to copy by hand. It never silently does nothing.
 */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const t = useTranslations("shop.share");
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  // Only filled in if we end up having to show the address for copying by hand.
  const [url, setUrl] = useState("");

  const share = async () => {
    const link = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch {
        // Cancelled, or refused by the browser: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setUrl(link);
      setState("manual");
    }
  };

  return (
    <span className="flex flex-col gap-2">
      <button
        type="button"
        onClick={share}
        className="text-char-700 hover:text-char-900 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="M8.4 10.8 15.6 6.4M8.4 13.2l7.2 4.4" />
        </svg>
        {t("cta")}
      </button>
      {state === "copied" && (
        <span role="status" className="text-ok-600 text-sm font-medium">
          {t("copied")}
        </span>
      )}
      {state === "manual" && (
        <span role="status" className="text-char-700 text-sm">
          {t("copyManually")}{" "}
          <bdi dir="ltr" className="break-all select-all">
            {url}
          </bdi>
        </span>
      )}
    </span>
  );
}
