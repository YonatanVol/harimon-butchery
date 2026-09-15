"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { quoteOrder } from "@/domain/order/totals";
import { formatGrams, grams } from "@/domain/weight/grams";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { addToCart } from "@/infra/cart/actions";
import { cx } from "../cx";
import { QuantityStepper } from "../primitives/QuantityStepper";
import { cappedAt, gramsFor, scaleLine } from "@/domain/recipes/scale";
import { announceCartChange } from "./CartButton";
import { useProblemText } from "./useProblemText";

export interface KitchenMeat {
  productId: string;
  variantId: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  pricingMode: "WEIGHT" | "PACKAGE";
  pricePerKgAgorot: number | null;
  packagePriceAgorot: number | null;
  minOrderG: number | null;
  maxOrderG: number | null;
  stepG: number | null;
  out: boolean;
  gramsPerServing?: number | undefined;
  quantity?: number | undefined;
  noteHe?: string | undefined;
  noteEn?: string | undefined;
}

function WakeLockToggle() {
  const t = useTranslations("shop.recipes");
  const [on, setOn] = useState(false);
  const lock = useRef<WakeLockSentinel | null>(null);
  // Server and first client render agree (not supported); the button appears once the browser says it can.
  const supported = useSyncExternalStore(
    () => () => {},
    () => "wakeLock" in navigator,
    () => false,
  );

  useEffect(() => () => void lock.current?.release(), []);
  if (!supported) return null;

  const toggle = async () => {
    if (on) {
      await lock.current?.release();
      lock.current = null;
      setOn(false);
      return;
    }
    try {
      lock.current = await navigator.wakeLock.request("screen");
      lock.current.addEventListener("release", () => setOn(false));
      setOn(true);
    } catch {
      setOn(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={cx("inline-flex min-h-11 items-center gap-2 border px-4 text-sm", on ? "bg-char-900 text-bone-50 border-char-900" : "border-bone-300 hover:border-char-900")}
    >
      <span aria-hidden className={cx("size-2 rounded-full", on ? "bg-brass-300" : "bg-bone-400")} />
      {on ? t("screenOn") : t("keepScreenOn")}
    </button>
  );
}

export function StepTimer({ minutes }: { minutes: number }) {
  const t = useTranslations("shop.recipes");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const current = Date.now();
      if (current >= endsAt) {
        setEndsAt(null);
        setDone(true);
        if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      } else {
        setNow(current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = endsAt === null ? null : Math.max(0, Math.ceil((endsAt - Math.max(now, endsAt - minutes * 60_000)) / 1000));
  const mm = left !== null ? String(Math.floor(left / 60)).padStart(2, "0") : "";
  const ss = left !== null ? String(left % 60).padStart(2, "0") : "";

  return (
    <span className="inline-flex items-center gap-2">
      {left === null ? (
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setNow(Date.now());
            setEndsAt(Date.now() + minutes * 60_000);
          }}
          className="border-bone-300 hover:border-char-900 inline-flex min-h-11 items-center gap-1.5 border px-3 text-sm"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="12" cy="13" r="7" />
            <path d="M12 9v4l2.5 2M10 3h4" />
          </svg>
          {done ? t("timerDone") : t("timerStart", { m: minutes })}
        </button>
      ) : (
        <>
          <span role="timer" aria-live="off" className="font-display text-2xl tabular-nums" dir="ltr">
            {mm}:{ss}
          </span>
          <button type="button" onClick={() => setEndsAt(null)} className="text-char-500 hover:text-char-900 min-h-11 px-3 text-sm underline underline-offset-4">
            {t("timerStop")}
          </button>
        </>
      )}
      {done && (
        <span role="status" className="sr-only">
          {t("timerDone")}
        </span>
      )}
    </span>
  );
}

/**
 * The working part of a recipe: choose servings, see every amount follow, and put exactly that meat in the cart
 * (rounded to what the butcher cuts, within each cut's limits).
 */
export function RecipeKitchen({
  baseServings,
  meat,
  ingredientsHe,
  ingredientsEn,
}: {
  baseServings: number;
  meat: KitchenMeat[];
  ingredientsHe: string[];
  ingredientsEn: string[];
}) {
  const t = useTranslations("shop.recipes");
  const locale = useLocale() as Locale;
  const he = locale === "he";
  const problemText = useProblemText();
  const [servings, setServings] = useState(baseServings);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const factor = servings / baseServings;
  const ingredients = he ? ingredientsHe : ingredientsEn;
  const orderable = meat.filter((m) => !m.out);

  const amountOf = (m: KitchenMeat) =>
    m.pricingMode === "WEIGHT" ? { requestedG: gramsFor(m, servings), quantity: null } : { requestedG: null, quantity: Math.max(1, Math.ceil((m.quantity ?? 1) * factor)) };

  const estimate = quoteOrder(
    orderable.map((m) => {
      const a = amountOf(m);
      return a.requestedG !== null
        ? { mode: "WEIGHT" as const, pricePerKg: agorot(m.pricePerKgAgorot ?? 0), requested: grams(a.requestedG), toleranceBp: 0 }
        : { mode: "PACKAGE" as const, unitPrice: agorot(m.packagePriceAgorot ?? 0), quantity: a.quantity ?? 1 };
    }),
  ).estimateTotal;

  const busy = useRef(false);
  const addAll = () => {
    if (busy.current) return;
    busy.current = true;
    setResult(null);
    startTransition(async () => {
      const added: string[] = [];
      const failed: string[] = [];
      let count: number | undefined;
      for (const m of orderable) {
        const name = he ? m.nameHe : m.nameEn;
        try {
          const a = amountOf(m);
          const r = await addToCart({
            variantId: m.variantId,
            requestedG: a.requestedG,
            quantity: a.quantity,
            note: (he ? m.noteHe : m.noteEn) ?? "",
            locale,
          });
          if (r.ok) {
            added.push(name);
            count = r.count;
          } else failed.push(`${name}: ${problemText(r.problem)}`);
        } catch {
          failed.push(`${name}: ${problemText({ key: "NETWORK" })}`);
        }
      }
      busy.current = false;
      if (added.length) announceCartChange(count);
      if (failed.length === 0) setResult({ ok: true, text: t("addedAll", { count: added.length }) });
      else
        setResult({
          ok: false,
          text: added.length ? t("addedSome", { added: added.join(", "), failed: failed.join(" · ") }) : failed.join(" · "),
        });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="border-bone-300 flex flex-wrap items-center justify-between gap-4 border-y py-4">
        <div className="flex items-center gap-3">
          <span className="text-char-500 text-sm">{t("servings")}</span>
          <QuantityStepper label={t("servings")} value={servings} max={24} onChange={setServings} maxReason={t("maxServings", { max: 24 })} />
        </div>
        <WakeLockToggle />
      </div>

      <section aria-labelledby="meat-title" className="flex flex-col gap-4">
        <h2 id="meat-title" className="font-display text-2xl">
          {t("fromButcher")}
        </h2>
        <ul className="divide-bone-300 border-bone-300 divide-y border-y">
          {meat.map((m) => {
            const a = amountOf(m);
            return (
              <li key={m.slug} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Link href={`/p/${m.slug}`} className="font-medium underline-offset-4 hover:underline">
                    {he ? m.nameHe : m.nameEn}
                  </Link>
                  {(he ? m.noteHe : m.noteEn) && <p className="text-char-500 text-sm">{he ? m.noteHe : m.noteEn}</p>}
                  {m.out && <p className="text-bad-600 text-sm">{t("outNow")}</p>}
                  {!m.out && m.pricingMode === "WEIGHT" && cappedAt(m, servings) && (
                    <p className="text-warn-600 text-sm">{t("capped", { max: formatGrams(grams(m.maxOrderG ?? 0), locale) })}</p>
                  )}
                </div>
                <bdi className="shrink-0 font-semibold tabular-nums">
                  {a.requestedG !== null ? formatGrams(grams(a.requestedG), locale) : `× ${a.quantity}`}
                </bdi>
              </li>
            );
          })}
        </ul>
        {orderable.length > 0 ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={addAll}
              aria-busy={pending || undefined}
              aria-disabled={pending || undefined}
              className="bg-char-900 text-bone-50 hover:bg-char-800 min-h-14 rounded-[2px] px-6 text-base font-semibold"
            >
              {pending ? t("adding") : t("addAll", { total: formatAgorot(estimate, locale) })}
            </button>
            <p className="text-char-500 text-xs">{t("addAllNote")}</p>
          </div>
        ) : (
          <p className="text-bad-600 text-sm font-medium">{t("allOut")}</p>
        )}
        {result && (
          <div role={result.ok ? "status" : "alert"} className={cx("flex flex-wrap items-center justify-between gap-3 border p-4", result.ok ? "border-ok-600/30 bg-bone-50" : "border-bad-600/30 bg-bad-600/5")}>
            <p className={cx("font-medium", result.ok ? "text-ok-600" : "text-bad-600")}>{result.text}</p>
            {result.ok && (
              <Link href="/cart" className="bg-char-900 text-bone-50 inline-flex min-h-11 items-center rounded-[2px] px-5 text-sm font-semibold">
                {t("goToCart")}
              </Link>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="ingredients-title" className="flex flex-col gap-4">
        <h2 id="ingredients-title" className="font-display text-2xl">
          {t("ingredients")}
        </h2>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {ingredients.map((line, i) => (
            <li key={i} className="border-bone-300 flex gap-3 border-b py-2.5 text-[15px]">
              <span aria-hidden className="bg-brass-500 mt-2.5 size-1 shrink-0 rounded-full" />
              {scaleLine(line, factor)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
