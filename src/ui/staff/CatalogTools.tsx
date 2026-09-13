"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { percentChangeBp } from "@/domain/money/change";
import { formatAgorot } from "@/domain/money/format";
import { fromDecimalShekels, toDecimalShekels } from "@/domain/money/wire";
import type { Locale } from "@/i18n/routing";
import type { CatalogProblem } from "@/infra/catalog/admin";
import { staffChangePrice, staffSetPublished } from "@/infra/catalog/adminActions";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { Sheet } from "./pack/Sheet";

/** Above this, the editor asks twice: a 10× typo on a price reaches every customer at once. */
const BIG_CHANGE_BP = 2_000;

function useProblem() {
  const t = useTranslations("staff.catalog.problems");
  const locale = useLocale() as Locale;
  return (p: CatalogProblem | { key: string } | null) => {
    if (!p) return t("NETWORK");
    if (p.key === "PRICE_CHANGED_MEANWHILE" && "current" in p) return t("PRICE_CHANGED_MEANWHILE", { current: formatAgorot(agorot(p.current), locale) });
    if (p.key === "CERTIFICATE_EXPIRED" && "validUntil" in p) return t("CERTIFICATE_EXPIRED", { date: p.validUntil });
    return t(p.key as never);
  };
}

export function PublishToggle({ productId, published, cannotPublish }: { productId: string; published: boolean; cannotPublish: string | null }) {
  const t = useTranslations("staff.catalog");
  const problemText = useProblem();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant={published ? "secondary" : "primary"}
        disabledReason={!published ? cannotPublish : null}
        pendingLabel={pending ? t("saving") : null}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await staffSetPublished(productId, !published).catch(() => null);
            if (!r || !r.ok) setError(problemText(r && !r.ok ? r.problem : null));
          });
        }}
      >
        {published ? t("hide") : t("show")}
      </Button>
      <span className={cx("text-xs", published ? "text-ok-600" : "text-char-500")}>{published ? t("shown") : t("hidden")}</span>
      {error && (
        <span role="alert" className="text-bad-600 text-xs">
          {error}
        </span>
      )}
    </span>
  );
}

export function PriceEditor({ productId, name, current, perKg, blockedReason }: { productId: string; name: string; current: number; perKg: boolean; blockedReason: string | null }) {
  const t = useTranslations("staff.catalog");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" disabledReason={blockedReason} onClick={() => setOpen(true)}>
        {t("editPrice")}
      </Button>
      {open && <PriceSheet productId={productId} name={name} current={current} perKg={perKg} onClose={() => setOpen(false)} />}
    </>
  );
}

function PriceSheet({ productId, name, current, perKg, onClose }: { productId: string; name: string; current: number; perKg: boolean; onClose: () => void }) {
  const t = useTranslations("staff.catalog");
  const locale = useLocale() as Locale;
  const problemText = useProblem();
  const inputId = useId();
  const [text, setText] = useState(toDecimalShekels(agorot(current)));
  const [confirmedBig, setConfirmedBig] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();

  let next: number | null = null;
  try {
    next = fromDecimalShekels(text.trim().replace(",", "."));
  } catch {
    next = null;
  }
  const money = (a: number) => formatAgorot(agorot(a), locale);
  const changeBp = next !== null ? percentChangeBp(agorot(current), agorot(next)) : 0;
  const big = Math.abs(changeBp) >= BIG_CHANGE_BP;
  const pct = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-IL", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" }).format(changeBp / 10_000);

  const blocked = next === null || next < 100 ? t("problems.INVALID_PRICE") : next === current ? t("unchanged") : big && !confirmedBig ? t("confirmBigFirst") : null;

  return (
    <Sheet title={t("priceTitle", { name })} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="font-medium">
          {perKg ? t("newPricePerKg") : t("newPricePerPackage")}
        </label>
        <input
          id={inputId}
          inputMode="decimal"
          dir="ltr"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setConfirmedBig(false);
          }}
          className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-14 w-48 rounded-xl px-4 text-2xl tabular-nums ring-1 outline-none focus-visible:ring-2"
        />
      </div>

      {next !== null && next !== current && (
        <p className={cx("rounded-xl p-3 text-lg", big ? "bg-warn-600/10" : "bg-bone-100")}>
          {t("preview", { before: money(current), after: money(next) })} <bdi dir="ltr" className="font-semibold tabular-nums">({pct})</bdi>
        </p>
      )}
      {big && next !== null && (
        <label className="flex min-h-11 items-center gap-3 font-medium">
          <input type="checkbox" checked={confirmedBig} onChange={(e) => setConfirmedBig(e.target.checked)} className="accent-wine-600 size-5" />
          {t("confirmBig", { pct })}
        </label>
      )}
      <p className="text-char-700 text-sm">{t("priceHelp")}</p>

      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={cx("font-medium", message.tone === "bad" ? "text-bad-600" : "text-ok-600")}>
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabledReason={blocked}
          pendingLabel={pending ? t("saving") : null}
          onClick={() => {
            setMessage(null);
            start(async () => {
              const r = await staffChangePrice(productId, next!, current).catch(() => null);
              if (!r || !r.ok) return setMessage({ tone: "bad", text: problemText(r && !r.ok ? r.problem : null) });
              onClose();
            });
          }}
        >
          {next !== null && next !== current ? t("savePrice", { price: money(next) }) : t("save")}
        </Button>
        <Button size="lg" variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </Sheet>
  );
}
