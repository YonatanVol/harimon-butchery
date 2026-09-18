"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker, and offers to put the shop on the home screen — but only once the browser
 * says it can be installed. No banner, no nagging: a link in the footer that simply isn't there when
 * installing isn't possible (an installed app, an unsupported browser, or iOS, which has no such prompt).
 */
export function InstallApp() {
  const t = useTranslations("shop.footer");
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // An unregistered worker only means no offline page; the shop itself works exactly the same.
        });
      } else {
        // Development rebuilds keep the same file names, so a cached build file would be the stale one.
        // Any worker left over from a production visit on the same host is removed here.
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      }
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        // The browser allows one prompt per event; asking again needs a fresh one from the browser.
        if (outcome) setPrompt(null);
      }}
      className="hover:text-bone-50 inline-flex min-h-11 items-center text-start"
    >
      {t("install")}
    </button>
  );
}
