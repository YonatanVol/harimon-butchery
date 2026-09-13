"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { formatGrams, grams } from "@/domain/weight/grams";
import { priceForWeight } from "@/domain/weight/reprice";
import { classifyWeight, toleranceBounds } from "@/domain/weight/tolerance";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PackLine, PackView } from "@/infra/orders/packView";
import * as act from "@/infra/orders/weighingActions";
import type { WeighingProblem } from "@/infra/orders/weighing";
import { cx } from "../../cx";
import { Button } from "../../primitives/Button";
import { ToleranceBar } from "../../primitives/ToleranceBar";
import { ProductImage } from "../../shop/ProductImage";
import { Keypad } from "./Keypad";
import { LineList } from "./LineList";
import { Sheet } from "./Sheet";

type SheetState =
  | null
  | { kind: "substitute"; line: PackLine }
  | { kind: "manager"; line: PackLine; actualG: number }
  | { kind: "review" };

const UNDO_MS = 10_000;

export function PackStation({ initial, canCapture, autoStart }: { initial: PackView; canCapture: boolean; autoStart?: boolean }) {
  const t = useTranslations("staff.pack");
  const locale = useLocale() as Locale;
  const [view, setView] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(() => firstOpen(initial)?.id ?? initial.lines[0]?.id ?? null);
  const [typed, setTyped] = useState("");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<(() => void) | null>(null);
  const [undo, setUndo] = useState<{ lineId: string; label: string; until: number } | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const money = useCallback((a: number) => formatAgorot(agorot(a), locale), [locale]);
  const g = useCallback((n: number) => formatGrams(grams(n), locale), [locale]);
  const name = (l: PackLine) => (locale === "he" ? l.nameHe : l.nameEn);
  const active = view.lines.find((l) => l.id === activeId) ?? null;

  const problemText = (p: WeighingProblem) =>
    p.key === "CAPTURE_FAILED" ? `${t("captureFailedTitle")}: ${t(`captureReasons.${p.reason}` as never)}` : t(`problems.${p.key}`);

  /** Run a server action, adopt the fresh view, and surface any problem in words. */
  const call = <R extends { ok: boolean; view: PackView | null; problem?: WeighingProblem }>(label: string | null, fn: () => Promise<R>, onOk?: (r: R) => void) => {
    setProblem(null);
    setLastFailed(null);
    setBusyLabel(label);
    start(async () => {
      try {
        const r = await fn();
        if (r.view) setView(r.view);
        if (r.ok) onOk?.(r);
        else if (r.problem) setProblem(problemText(r.problem));
      } catch {
        setProblem(t("problems.NETWORK"));
        setLastFailed(() => () => call(label, fn, onOk));
      } finally {
        setBusyLabel(null);
      }
    });
  };

  // Keep the tablet awake while weighing.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  // The undo bar stays for 10 seconds, then disappears on its own.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), Math.max(0, undo.until - Date.now()));
    return () => clearTimeout(timer);
  }, [undo]);

  // While an item waits for the customer, check every 10 seconds so their answer appears without a reload.
  const waiting = view.lines.some((l) => l.pendingActualG);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      act
        .packRefresh(view.id)
        .then((fresh) => fresh && setView((v) => (fresh.version >= v.version ? fresh : v)))
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, [waiting, view.id]);

  const typedG = Number(typed) || 0;
  const bounds = active?.pricingMode === "WEIGHT" && active.estimatedG && active.toleranceBp != null ? toleranceBounds(grams(active.estimatedG), active.toleranceBp) : null;
  const classification = bounds && typedG > 0 ? classifyWeight(grams(typedG), bounds) : null;
  const livePrice = active?.pricePerKgAgorot && typedG > 0 ? priceForWeight(agorot(active.pricePerKgAgorot), grams(typedG)) : null;

  const runningTotal =
    view.lines.reduce((sum, l) => (l.id === activeId ? sum : sum + (l.finalAgorot ?? (l.status === "PENDING" ? l.estimateAgorot : 0))), 0) +
    (active ? (livePrice ?? active.finalAgorot ?? (active.status === "PENDING" ? active.estimateAgorot : 0)) : 0) +
    view.deliveryFeeAgorot;

  const advance = (fresh: PackView, fromId: string) => {
    const next = fresh.lines.find((l) => l.status === "PENDING" && l.id !== fromId) ?? firstOpen(fresh);
    setActiveId(next?.id ?? fromId);
    setTyped("");
  };

  // Arriving from "start preparing": start at once instead of asking for a second tap.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current || view.status !== "AUTHORIZED") return;
    autoStarted.current = true;
    call(t("starting"), () => act.packStart(view.id), (r) => advance(r.view!, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  const weigh = (opts: { confirmUnder?: boolean; giveExtraFree?: { managerId: string; pin: string } } = {}) => {
    if (!active || !typedG) return;
    const line = active;
    const weight = typedG;
    call(t("saving"), () => act.packWeigh({ orderId: view.id, lineId: line.id, actualG: weight, expectedVersion: view.version, ...opts }), (r) => {
      setUndo({ lineId: line.id, label: t("undo", { name: name(line), weight: g(weight) }), until: Date.now() + UNDO_MS });
      setSheet(null);
      advance(r.view!, line.id);
    });
  };

  const undoLast = () => {
    if (!undo) return;
    const { lineId } = undo;
    setUndo(null);
    call(t("saving"), () => act.packUndo({ orderId: view.id, lineId, expectedVersion: view.version }), () => {
      setActiveId(lineId);
      setTyped("");
    });
  };

  // Physical keyboard: digits, Backspace, Enter to confirm, Esc to undo the last weighing.
  useEffect(() => {
    if (sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (/^\d$/.test(e.key)) setTyped((v) => (v + e.key).replace(/^0+/, "").slice(0, 5));
      else if (e.key === "Backspace") setTyped((v) => v.slice(0, -1));
      else if (e.key === "Enter" && classification?.kind === "within") weigh();
      else if (e.key === "Escape" && undo) undoLast();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remaining = view.lines.filter((l) => l.status === "PENDING").length;
  const unhandled = view.lines.find(
    (l) => l.status === "WEIGHED" && (l.handlingFlags.includes("REQUIRES_BROILING_TZLIYA") || l.handlingFlags.includes("REQUIRES_SALTING")) && !l.handlingConfirmed,
  );
  const waitingLine = view.lines.find((l) => l.pendingActualG);
  const finishReason = !canCapture
    ? t("problems.NOT_PERMITTED")
    : waitingLine
      ? t("finishReasonWaiting", { name: name(waitingLine) })
      : remaining > 0
      ? t("finishReasonLines", { count: remaining })
      : unhandled
        ? t("finishReasonHandling", { name: name(unhandled) })
        : null;
  const finalTotal = view.lines.reduce((s, l) => s + (l.finalAgorot ?? 0), 0) + view.deliveryFeeAgorot;
  // An extra the customer approved was already charged on its own; finishing charges only the rest, on the hold.
  const chargeNow = finalTotal - view.extraChargedAgorot;

  // ── Outcome screens once picking is over ─────────────────────────────────
  if (view.status === "AUTHORIZED") {
    return (
      <Centered>
        <p className="text-2xl font-semibold">{t("order", { number: view.orderNumber, customer: view.customerName })}</p>
        <Button size="xl" pendingLabel={pending ? t("starting") : null} onClick={() => call(t("starting"), () => act.packStart(view.id), (r) => advance(r.view!, ""))}>
          {t("start")}
        </Button>
        {problem && <ProblemLine text={problem} />}
      </Centered>
    );
  }

  if (view.status === "CAPTURED" || view.status === "PACKED") {
    return (
      <Centered>
        <p className="text-ok-600 text-4xl font-bold">{t("capturedTitle", { amount: money(view.capturedAgorot ?? 0), hold: money(view.authorizationCeilingAgorot) })}</p>
        {view.invoiceNumber && <p className="text-char-700 text-xl">{t("capturedBody", { invoice: view.invoiceNumber })}</p>}
        {view.status === "CAPTURED" ? (
          <Button size="xl" pendingLabel={pending ? t("saving") : null} onClick={() => call(t("saving"), () => act.packMarkPacked(view.id))}>
            {t("markPacked")}
          </Button>
        ) : (
          <Link href="/staff" className="bg-char-900 text-bone-50 inline-flex min-h-22 items-center rounded-2xl px-10 text-2xl font-semibold">
            {t("packedDone")}
          </Link>
        )}
        {problem && <ProblemLine text={problem} />}
      </Centered>
    );
  }

  if (view.status === "CAPTURE_FAILED") {
    const left = 3 - view.captureAttempts;
    return (
      <Centered>
        <div role="alert" className="bg-bad-600/10 border-bad-600 flex w-full max-w-xl flex-col gap-3 rounded-3xl border-s-8 p-8">
          <p className="text-bad-600 text-3xl font-bold">{t("captureFailedTitle")}</p>
          <p className="text-xl">{view.lastCaptureFailure ? t(`captureReasons.${view.lastCaptureFailure}` as never) : ""}</p>
          <p className="text-char-700">{left > 0 ? t("attemptsLeft", { count: left }) : t("noAttempts")}</p>
        </div>
        <Button
          size="xl"
          disabledReason={left > 0 ? null : t("noAttempts")}
          pendingLabel={pending ? t("charging", { amount: money((view.finalTotalAgorot ?? 0) - view.extraChargedAgorot) }) : null}
          onClick={() => call(null, () => act.packRetryCapture(view.id))}
        >
          {t("retry")}
        </Button>
        <Link href={`/staff/orders/${view.id}`} className="text-char-700 min-h-11 underline-offset-4 hover:underline">
          {t("back")}
        </Link>
        {problem && <ProblemLine text={problem} />}
      </Centered>
    );
  }

  if (view.status !== "PICKING" && view.status !== "AWAITING_CUSTOMER_APPROVAL") {
    return (
      <Centered>
        <p className="text-2xl">{t("notPicking", { status: view.status })}</p>
        <Link href="/staff" className="bg-char-900 text-bone-50 inline-flex min-h-16 items-center rounded-2xl px-8 text-xl">
          {t("back")}
        </Link>
      </Centered>
    );
  }

  // ── The weighing layout: lines · active line · keypad ─────────────────────
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold">{t("order", { number: view.orderNumber, customer: view.customerName })}</p>
          <p className={cx("text-lg", runningTotal > view.authorizationCeilingAgorot ? "text-bad-600 font-semibold" : "text-char-700")}>
            {t("runningTotal", { total: money(runningTotal), hold: money(view.authorizationCeilingAgorot) })}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Button size="lg" disabledReason={finishReason} onClick={() => setSheet({ kind: "review" })}>
            {t("finish")}
          </Button>
          <Link href="/staff" className="ring-char-900/20 inline-flex min-h-16 items-center rounded-2xl px-5 text-lg ring-1">
            {t("back")}
          </Link>
        </div>
      </header>

      {waitingLine && view.approvalDeadlineAt && (
        <div role="status" className="bg-warn-600/10 border-warn-600 rounded-2xl border-s-8 p-4 text-lg">
          <strong>
            {t("waitingTitle", {
              name: name(waitingLine),
              weight: g(waitingLine.pendingActualG!),
              time: new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-IL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(new Date(view.approvalDeadlineAt)),
            })}
          </strong>{" "}
          {t("waitingBody")}
        </div>
      )}

      {problem && (
        <div role="alert" className="bg-bad-600/10 text-bad-600 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-xl font-semibold">
          {problem}
          {lastFailed && (
            <Button size="lg" variant="danger" onClick={lastFailed}>
              {t("retrySave")}
            </Button>
          )}
        </div>
      )}

      <div className="grid flex-1 gap-4 lg:grid-cols-[280px_1fr_340px]">
        <aside className="min-w-0">
          <LineList
            lines={view.lines}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setTyped("");
              setProblem(null);
            }}
          />
        </aside>

        <section className="bg-bone-50 ring-bone-300 flex min-w-0 flex-col gap-5 rounded-3xl p-6 ring-1">
          {active && (
            <>
              <div className="flex items-start gap-5">
                <ProductImage src={active.image} alt="" animal={active.animal} label="" sizes="160px" className="size-36 shrink-0 rounded-2xl" />
                <div className="min-w-0">
                  {active.isSubstitute && <p className="text-warn-600 font-semibold">{t("substituteLabel")}</p>}
                  <h1 className="text-[40px] leading-tight font-bold">{name(active)}</h1>
                  <p className="text-char-700 text-xl">{locale === "he" ? active.variantHe : active.variantEn}</p>
                  <p className="mt-1 text-[56px] leading-none font-bold tabular-nums">
                    {active.pricingMode === "WEIGHT" ? <bdi>{g(active.estimatedG!)}</bdi> : t("package", { count: active.quantity ?? 0 })}
                  </p>
                </div>
              </div>

              {(active.cutHe || active.note) && (
                <div className="border-wine-600 bg-wine-600/5 rounded-2xl border-s-8 p-4 text-xl">
                  {active.cutHe && (
                    <p>
                      <span className="text-char-500">{t("cut")}: </span>
                      <strong>{locale === "he" ? active.cutHe : active.cutEn}</strong>
                    </p>
                  )}
                  {active.note && (
                    <p className="mt-1">
                      <span className="text-char-500">{t("note")}: </span>
                      <strong>{active.note}</strong>
                    </p>
                  )}
                </div>
              )}

              {active.pricingMode === "WEIGHT" && bounds && (
                <div className="flex flex-col gap-3">
                  <ToleranceBar bounds={bounds} actual={typedG > 0 ? grams(typedG) : active.pendingActualG ? grams(active.pendingActualG) : active.actualG ? grams(active.actualG) : null} />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-char-500">{t("linePrice")}</span>
                    <bdi className="text-4xl font-bold tabular-nums">{money(livePrice ?? active.finalAgorot ?? active.estimateAgorot)}</bdi>
                  </div>
                </div>
              )}

              {active.handlingFlags.some((f) => f === "REQUIRES_BROILING_TZLIYA" || f === "REQUIRES_SALTING") && active.status === "WEIGHED" && (
                <label className={cx("flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl p-4 text-2xl font-semibold ring-2", active.handlingConfirmed ? "ring-ok-600 bg-ok-600/10" : "ring-warn-600 bg-warn-600/10")}>
                  <input
                    type="checkbox"
                    checked={active.handlingConfirmed}
                    disabled={active.handlingConfirmed || pending}
                    onChange={() => call(t("saving"), () => act.packHandling({ orderId: view.id, lineId: active.id, expectedVersion: view.version }))}
                    className="accent-ok-600 size-10"
                  />
                  <span>
                    {active.handlingFlags.includes("REQUIRES_BROILING_TZLIYA") ? t("handlingLiver") : t("handlingSalting")}
                    {!active.handlingConfirmed && <span className="text-warn-600 block text-base font-medium">{t("handlingNeeded")}</span>}
                  </span>
                </label>
              )}

              {classification?.kind === "over" && (
                <div role="group" aria-label={t("confirmOver")} className="bg-bad-600/5 ring-bad-600/30 grid gap-2 rounded-2xl p-3 ring-1 sm:grid-cols-3">
                  <Button size="lg" fullWidth variant="secondary" onClick={() => setTyped("")}>
                    {t("overTrim", { max: g(bounds!.max) })}
                  </Button>
                  <Button
                    size="lg"
                    fullWidth
                    variant="secondary"
                    disabledReason={waitingLine ? t("problems.ALREADY_ASKING") : null}
                    pendingLabel={busyLabel}
                    onClick={() => {
                      const line = active;
                      const weight = typedG;
                      call(t("saving"), () => act.packAskCustomer({ orderId: view.id, lineId: line.id, actualG: weight, expectedVersion: view.version, locale }), (r) => advance(r.view!, line.id));
                    }}
                  >
                    {t("overAsk")}
                  </Button>
                  <Button size="lg" fullWidth variant="secondary" onClick={() => setSheet({ kind: "manager", line: active, actualG: typedG })}>
                    {t("overFree")}
                  </Button>
                </div>
              )}
              {classification?.kind === "under" && (
                <div role="group" aria-label={t("confirmUnder")} className="bg-warn-600/5 ring-warn-600/30 grid gap-2 rounded-2xl p-3 ring-1 sm:grid-cols-2">
                  <Button size="lg" fullWidth pendingLabel={busyLabel} onClick={() => weigh({ confirmUnder: true })}>
                    {t("underAccept", { price: money(livePrice ?? 0) })}
                  </Button>
                  <Button size="lg" fullWidth variant="secondary" onClick={() => setTyped("")}>
                    {t("underRetry")}
                  </Button>
                </div>
              )}

              {active.pricingMode === "WEIGHT" && (active.status === "PENDING" || active.status === "WEIGHED") && !active.pendingActualG && !classification?.kind.match(/over|under/) && (
                <Button size="md" variant="secondary" disabledReason={t("scaleMissing")}>
                  {t("scale")}
                </Button>
              )}

              {undo && (
                <div className="bg-char-900 text-bone-50 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3 text-lg" role="status">
                  {undo.label}
                  <button type="button" onClick={undoLast} className="bg-bone-50/15 min-h-14 rounded-xl px-5 font-semibold">
                    {t("undoAction")}
                  </button>
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-3">
                {active.status === "PENDING" && active.pricingMode === "PACKAGE" && (
                  <Button size="xl" pendingLabel={busyLabel} onClick={() => call(t("saving"), () => act.packConfirmPackage({ orderId: view.id, lineId: active.id, expectedVersion: view.version }), (r) => advance(r.view!, active.id))}>
                    {t("packagePicked", { count: active.quantity ?? 0 })}
                  </Button>
                )}
                {(active.status === "PENDING" || active.status === "WEIGHED") && !active.isSubstitute && (
                  <Button size="xl" variant="secondary" disabledReason={active.pendingActualG ? t("problems.AWAITING_CUSTOMER") : null} onClick={() => setSheet({ kind: "substitute", line: active })}>
                    {t("short")}
                  </Button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-2">
          {active?.pricingMode === "WEIGHT" && (active.status === "PENDING" || active.status === "WEIGHED") && !active.pendingActualG ? (
            <>
              <div className="bg-bone-50 ring-bone-300 flex min-h-16 items-center justify-between rounded-2xl px-5 ring-1" aria-live="polite">
                <span className="text-char-500">{t("typed")}</span>
                <bdi dir="ltr" className="text-5xl font-bold tabular-nums">
                  {typed || "—"}
                </bdi>
              </div>
              <Keypad value={typed} onChange={setTyped} disabled={pending} requestedG={active.estimatedG} />

              {classification?.kind === "over" ? (
                <Button size="xl" fullWidth disabledReason={t("overTitle", { weight: g(typedG), max: g(bounds!.max) })}>
                  {t("confirmOver")}
                </Button>
              ) : classification?.kind === "under" ? (
                <Button size="xl" fullWidth disabledReason={t("underTitle", { weight: g(typedG), min: g(bounds!.min) })}>
                  {t("confirmUnder")}
                </Button>
              ) : (
                <Button size="xl" fullWidth disabledReason={typedG ? null : t("typeHint")} pendingLabel={busyLabel} onClick={() => weigh()}>
                  {typedG ? t("confirm", { weight: g(typedG), price: money(livePrice ?? 0) }) : t("confirmEmpty")}
                </Button>
              )}
            </>
          ) : active?.pendingActualG ? (
            <div className="bg-warn-600/10 ring-warn-600/40 flex flex-col gap-2 rounded-2xl p-5 text-lg ring-1" role="status">
              <strong className="text-2xl">{t("status.WAITING")}</strong>
              <span>{t("waitingLine", { weight: g(active.pendingActualG) })}</span>
            </div>
          ) : null}
        </aside>
      </div>


      {sheet?.kind === "substitute" && (
        <SubstituteSheet
          line={sheet.line}
          orderId={view.id}
          version={view.version}
          onClose={() => setSheet(null)}
          onDone={(fresh) => {
            setView(fresh);
            setSheet(null);
            advance(fresh, sheet.line.id);
          }}
          onProblem={setProblem}
          money={money}
        />
      )}
      {sheet?.kind === "manager" && (
        <ManagerSheet
          managers={view.managers}
          onClose={() => setSheet(null)}
          costAgorot={active?.pricePerKgAgorot && bounds ? priceForWeight(agorot(active.pricePerKgAgorot), grams(sheet.actualG)) - priceForWeight(agorot(active.pricePerKgAgorot), bounds.max) : 0}
          money={money}
          pending={pending}
          onConfirm={(managerId, pin) => weigh({ giveExtraFree: { managerId, pin } })}
          problem={problem}
        />
      )}
      {sheet?.kind === "review" && (
        <Sheet title={t("reviewTitle")} onClose={() => setSheet(null)}>
          <table className="w-full text-lg">
            <thead className="text-char-500 text-sm">
              <tr>
                <th className="text-start font-medium" />
                <th className="text-start font-medium">{t("reviewEstimate")}</th>
                <th className="text-start font-medium">{t("reviewActual")}</th>
                <th className="text-end font-medium" />
              </tr>
            </thead>
            <tbody>
              {view.lines.map((l) => (
                <tr key={l.id} className="border-bone-200 border-t">
                  <td className="py-2">{name(l)}</td>
                  <td className="py-2 tabular-nums">
                    <bdi>{l.pricingMode === "WEIGHT" ? g(l.estimatedG!) : `× ${l.quantity}`}</bdi>
                  </td>
                  <td className="py-2 tabular-nums">
                    <bdi>{l.status === "WEIGHED" ? (l.actualG ? g(l.actualG) : `× ${l.quantity}`) : t(`status.${l.status}`)}</bdi>
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    <bdi>{money(l.finalAgorot ?? 0)}</bdi>
                  </td>
                </tr>
              ))}
              <tr className="border-bone-200 border-t">
                <td className="py-2">{t("reviewDelivery")}</td>
                <td />
                <td />
                <td className="py-2 text-end tabular-nums"><bdi>{money(view.deliveryFeeAgorot)}</bdi></td>
              </tr>
            </tbody>
          </table>
          <div className="bg-bone-100 flex items-baseline justify-between rounded-2xl p-4">
            <span className="text-xl">{t("reviewFinal")}</span>
            <span className="text-end">
              <bdi className="block text-4xl font-bold tabular-nums">{money(finalTotal)}</bdi>
              <span className="text-char-500">
                {t("reviewHold")} <bdi>{money(view.authorizationCeilingAgorot)}</bdi>
              </span>
            </span>
          </div>
          {view.extraChargedAgorot > 0 && (
            <p className="text-lg">{t("reviewSplit", { extra: money(view.extraChargedAgorot), now: money(chargeNow) })}</p>
          )}
          {captureError && <ProblemLine text={captureError} />}
          <div className="flex flex-wrap gap-3">
            <Button
              size="xl"
              pendingLabel={pending ? t("charging", { amount: money(chargeNow) }) : null}
              onClick={() => {
                setCaptureError(null);
                call(null, () => act.packFinish({ orderId: view.id, expectedVersion: view.version }), () => setSheet(null));
              }}
            >
              {t("finishCharge", { amount: money(chargeNow) })}
            </Button>
            <Button size="xl" variant="ghost" onClick={() => setSheet(null)}>
              {t("back2")}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function firstOpen(v: PackView) {
  return v.lines.find((l) => l.status === "PENDING");
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">{children}</div>;
}

function ProblemLine({ text }: { text: string }) {
  return (
    <p role="alert" className="bg-bad-600/10 text-bad-600 rounded-2xl p-4 text-xl font-semibold">
      {text}
    </p>
  );
}

function SubstituteSheet({
  line,
  orderId,
  version,
  onClose,
  onDone,
  onProblem,
  money,
}: {
  line: PackLine;
  orderId: string;
  version: number;
  onClose: () => void;
  onDone: (view: PackView) => void;
  onProblem: (text: string) => void;
  money: (a: number) => string;
}) {
  const t = useTranslations("staff.pack");
  const locale = useLocale() as Locale;
  const [options, setOptions] = useState<Awaited<ReturnType<typeof act.packSubstituteOptions>> | null>(null);
  const [pending, start] = useTransition();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !line.allowSubstitute) return;
    loaded.current = true;
    act.packSubstituteOptions(line.id).then(setOptions).catch(() => setOptions([]));
  }, [line]);

  const run = (fn: () => Promise<{ ok: boolean; view: PackView | null; problem?: WeighingProblem }>) =>
    start(async () => {
      const r = await fn().catch(() => null);
      if (r?.ok && r.view) onDone(r.view);
      else {
        onProblem(r?.problem ? t(`problems.${r.problem.key}`) : t("problems.NETWORK"));
        onClose();
      }
    });

  return (
    <Sheet title={t("substituteTitle", { name: locale === "he" ? line.nameHe : line.nameEn })} onClose={onClose}>
      <p className={cx("text-xl font-medium", line.allowSubstitute ? "text-ok-600" : "text-warn-600")}>
        {line.allowSubstitute ? t("customerAllows") : t("customerRefuses")}
      </p>
      {line.allowSubstitute && (
        <ul className="flex flex-col gap-3">
          {options === null ? (
            <li className="text-char-500 text-lg">{t("loadingOptions")}</li>
          ) : options.length === 0 ? (
            <li className="text-char-500 text-lg">{t("noOptions")}</li>
          ) : (
            options.map((o) => (
              <li key={o.variantId}>
                <Button
                  size="xl"
                  fullWidth
                  variant="secondary"
                  disabledReason={o.fitsHold ? null : t("doesntFit")}
                  pendingLabel={pending ? t("saving") : null}
                  onClick={() => run(() => act.packSubstitute({ orderId, lineId: line.id, variantId: o.variantId, expectedVersion: version }))}
                >
                  {locale === "he" ? o.nameHe : o.nameEn} ·{" "}
                  <bdi>
                    {o.deltaPerKgAgorot <= 0 ? "−" : "+"}
                    {t("fitsHold", { delta: money(Math.abs(o.deltaPerKgAgorot)) })}
                  </bdi>
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
      <Button size="xl" variant="danger" pendingLabel={pending ? t("saving") : null} onClick={() => run(() => act.packShort({ orderId, lineId: line.id, expectedVersion: version }))}>
        {t("markShort", { amount: money(line.finalAgorot ?? line.estimateAgorot) })}
      </Button>
      <Button size="lg" variant="ghost" onClick={onClose}>
        {t("cancel")}
      </Button>
    </Sheet>
  );
}

function ManagerSheet({
  managers,
  onClose,
  onConfirm,
  costAgorot,
  money,
  pending,
  problem,
}: {
  managers: PackView["managers"];
  onClose: () => void;
  onConfirm: (managerId: string, pin: string) => void;
  costAgorot: number;
  money: (a: number) => string;
  pending: boolean;
  problem: string | null;
}) {
  const t = useTranslations("staff.pack");
  const locale = useLocale() as Locale;
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [pin, setPin] = useState("");

  return (
    <Sheet title={t("managerTitle")} onClose={onClose}>
      <p className="text-warn-600 text-xl font-semibold">{t("overFreeCost", { amount: money(costAgorot) })}</p>
      <label className="flex flex-col gap-2 text-lg">
        {t("managerChoose")}
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="bg-bone-50 min-h-16 rounded-xl border border-bone-300 px-4 text-xl">
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {locale === "he" ? m.nameHe : m.nameEn}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-lg">
        {t("managerPin")}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="bg-bone-50 min-h-16 rounded-xl border border-bone-300 px-4 text-3xl tracking-[0.5em]"
          dir="ltr"
        />
      </label>
      {problem && <ProblemLine text={problem} />}
      <div className="flex gap-3">
        <Button size="xl" disabledReason={pin.length >= 4 ? null : t("managerPinNeeded")} pendingLabel={pending ? t("saving") : null} onClick={() => onConfirm(managerId, pin)}>
          {t("managerConfirm")}
        </Button>
        <Button size="xl" variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </Sheet>
  );
}
