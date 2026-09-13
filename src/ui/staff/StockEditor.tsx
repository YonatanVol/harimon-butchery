"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { formatGrams, grams } from "@/domain/weight/grams";
import type { Locale } from "@/i18n/routing";
import { staffChangeStock, staffSetRestockDate } from "@/infra/stock/actions";
import { MAX_STOCK_CHANGE_G, MAX_STOCK_CHANGE_UNITS } from "@/domain/catalog/stockLimits";
import type { StockProblem } from "@/infra/stock/stock";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { Sheet } from "./pack/Sheet";

type Kind = "RECEIVED" | "SPOILAGE" | "COUNT_CORRECTION";

/** Receive, throw away or recount one product — the result is shown before saving, in the product's own unit. */
export function StockEditor({ productId, name, weight, onHand, reserved, restockDate }: { productId: string; name: string; weight: boolean; onHand: number; reserved: number; restockDate: string | null }) {
  const t = useTranslations("staff.stock");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("update")}
      </Button>
      {open && <StockSheet {...{ productId, name, weight, onHand, reserved, restockDate }} onClose={() => setOpen(false)} />}
    </>
  );
}

function StockSheet({ productId, name, weight, onHand, reserved, restockDate, onClose }: { productId: string; name: string; weight: boolean; onHand: number; reserved: number; restockDate: string | null; onClose: () => void }) {
  const t = useTranslations("staff.stock");
  const locale = useLocale() as Locale;
  const amountId = useId();
  const noteId = useId();
  const dateId = useId();
  const [kind, setKind] = useState<Kind>("RECEIVED");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(restockDate ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"stock" | "date" | null>(null);

  const qty = (n: number) => (weight ? formatGrams(grams(n), locale) : t("units", { count: n }));
  const n = /^\d+$/.test(amount) ? Number(amount) : null;
  const next = n === null ? null : kind === "RECEIVED" ? onHand + n : kind === "SPOILAGE" ? onHand - n : n;

  const blocked =
    n === null
      ? t(weight ? "amountMissingG" : "amountMissingUnits")
      : n === 0 && kind !== "COUNT_CORRECTION"
        ? t(weight ? "amountMissingG" : "amountMissingUnits")
        : n > (weight ? MAX_STOCK_CHANGE_G : MAX_STOCK_CHANGE_UNITS)
          ? t("problems.TOO_LARGE", { max: qty(weight ? MAX_STOCK_CHANGE_G : MAX_STOCK_CHANGE_UNITS) })
          : next !== null && next < reserved
            ? t("problems.BELOW_RESERVED", { reserved: qty(reserved) })
            : kind !== "RECEIVED" && note.trim().length < 3
              ? t("problems.NOTE_REQUIRED")
              : null;

  const problemText = (p: StockProblem) =>
    p.key === "BELOW_RESERVED" ? t("problems.BELOW_RESERVED", { reserved: qty(p.reserved) }) : p.key === "TOO_LARGE" ? t("problems.TOO_LARGE", { max: qty(p.max) }) : t(`problems.${p.key}`);

  return (
    <Sheet title={t("sheetTitle", { name })} onClose={onClose}>
      <p className="text-char-700">{t("sheetNow", { onHand: qty(onHand), reserved: qty(reserved) })}</p>

      <div role="radiogroup" aria-label={t("kind")} className="grid gap-2 sm:grid-cols-3">
        {(["RECEIVED", "SPOILAGE", "COUNT_CORRECTION"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cx("min-h-16 rounded-xl px-3 text-start ring-1", kind === k ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-100 ring-bone-300")}
          >
            <span className="block font-semibold">{t(`kinds.${k}`)}</span>
            <span className={cx("text-xs", kind === k ? "text-bone-300" : "text-char-500")}>{t(`kindHelp.${k}`)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={amountId} className="font-medium">
          {t(kind === "COUNT_CORRECTION" ? (weight ? "countedG" : "countedUnits") : weight ? "amountG" : "amountUnits")}
        </label>
        <input
          id={amountId}
          inputMode="numeric"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
          className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-14 w-48 rounded-xl px-4 text-2xl tabular-nums ring-1 outline-none focus-visible:ring-2"
        />
        {n !== null && weight && n > 0 && <p className="text-char-700 text-sm">= <bdi>{qty(n)}</bdi></p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={noteId} className="font-medium">
          {t(kind === "RECEIVED" ? "noteOptional" : "noteRequired")}
        </label>
        <input id={noteId} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-12 rounded-xl px-3 ring-1 outline-none focus-visible:ring-2" />
      </div>

      {next !== null && next >= 0 && (
        <p className="bg-bone-100 rounded-xl p-3 text-lg">
          {t("preview", { before: qty(onHand), after: qty(next) })}
        </p>
      )}

      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={cx("font-medium", message.tone === "bad" ? "text-bad-600" : "text-ok-600")}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <Button
          size="lg"
          disabledReason={blocked}
          pendingLabel={pending && busy === "stock" ? t("saving") : null}
          onClick={() => {
            setMessage(null);
            setBusy("stock");
            start(async () => {
              const r = await staffChangeStock({ productId, kind, amount: n ?? -1, note }).catch(() => null);
              setBusy(null);
              if (!r) return setMessage({ tone: "bad", text: t("problems.NETWORK") });
              if (!r.ok) return setMessage({ tone: "bad", text: problemText(r.problem as StockProblem) });
              setMessage({ tone: "ok", text: r.notified ? t("savedNotified", { count: r.notified }) : t("saved") });
              setAmount("");
              setNote("");
            });
          }}
        >
          {t("save")}
        </Button>
        <Button size="lg" variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      <hr className="border-bone-300" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={dateId} className="font-medium">
            {t("restockDate")}
          </label>
          <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-bone-50 ring-bone-300 min-h-12 rounded-xl px-3 ring-1" />
        </div>
        <Button
          variant="secondary"
          disabledReason={(date || null) === restockDate ? t("dateUnchanged") : null}
          pendingLabel={pending && busy === "date" ? t("saving") : null}
          onClick={() => {
            setMessage(null);
            setBusy("date");
            start(async () => {
              const r = await staffSetRestockDate(productId, date || null).catch(() => null);
              setBusy(null);
              setMessage(!r ? { tone: "bad", text: t("problems.NETWORK") } : r.ok ? { tone: "ok", text: date ? t("dateSaved") : t("dateCleared") } : { tone: "bad", text: problemText(r.problem as StockProblem) });
            });
          }}
        >
          {date ? t("saveDate") : t("clearDate")}
        </Button>
      </div>
    </Sheet>
  );
}
