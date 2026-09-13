"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { fromDecimalShekels, toDecimalShekels } from "@/domain/money/wire";
import type { Locale } from "@/i18n/routing";
import type { DeliveryProblem, DeliveryResult } from "@/infra/orders/delivery";
import { staffRefund, staffShopDecision } from "@/infra/orders/staffActions";
import { cx } from "../cx";
import { Button } from "../primitives/Button";

export type ManagerActionKind = "CANCEL" | "FORCE_DISPATCH" | "REFUND";
export type ManagerAction = { kind: ManagerActionKind; blockedReason: string | null };

const MIN_REASON = 10;

/** Decisions that change money or cancel an order: each needs a written reason, and says what will happen before it happens. */
export function ManagerActions({ orderId, actions, refundableAgorot }: { orderId: string; actions: ManagerAction[]; refundableAgorot: number }) {
  const t = useTranslations("staff.manager");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<ManagerActionKind | null>(null);
  const money = (a: number) => formatAgorot(agorot(a), locale);

  return (
    <section className="bg-bone-50 ring-bone-300 rounded-2xl p-5 ring-1">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {actions.map((a) => (
          <Button
            key={a.kind}
            variant={open === a.kind ? "primary" : "secondary"}
            size="lg"
            disabledReason={a.blockedReason}
            aria-expanded={open === a.kind}
            onClick={() => setOpen((o) => (o === a.kind ? null : a.kind))}
          >
            {t(`${a.kind}.open`)}
          </Button>
        ))}
      </div>
      {open && (
        <DecisionForm
          key={open}
          kind={open}
          orderId={orderId}
          refundableAgorot={refundableAgorot}
          money={money}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function DecisionForm({
  kind,
  orderId,
  refundableAgorot,
  money,
  onClose,
}: {
  kind: ManagerActionKind;
  orderId: string;
  refundableAgorot: number;
  money: (a: number) => string;
  onClose: () => void;
}) {
  const t = useTranslations("staff.manager");
  const reasonId = useId();
  const amountId = useId();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(() => toDecimalShekels(agorot(refundableAgorot)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const missing = Math.max(0, MIN_REASON - reason.trim().length);
  let amountAgorot = 0;
  try {
    amountAgorot = fromDecimalShekels(amount.trim().replace(",", "."));
  } catch {
    amountAgorot = 0;
  }
  const amountValid = kind !== "REFUND" || (amountAgorot > 0 && amountAgorot <= refundableAgorot);

  const blocked = missing > 0 ? t("reasonMissing", { count: missing }) : !amountValid ? t("problems.INVALID_AMOUNT", { max: money(refundableAgorot) }) : null;

  const problemText = (p: DeliveryProblem) =>
    p.key === "INVALID_AMOUNT" ? t("problems.INVALID_AMOUNT", { max: money(p.maxAgorot) }) : t(`problems.${p.key}`);

  const submit = () => {
    setError(null);
    start(async () => {
      let r: DeliveryResult | null;
      try {
        r =
          kind === "REFUND"
            ? await staffRefund({ orderId, amountAgorot, reason })
            : await staffShopDecision({ orderId, decision: kind, reason });
      } catch {
        r = null;
      }
      if (!r) setError(t("problems.NETWORK"));
      else if (!r.ok) setError(problemText(r.problem));
      else onClose();
    });
  };

  return (
    <div className={cx("mt-4 flex flex-col gap-4 rounded-2xl border-s-8 p-4", kind === "CANCEL" ? "border-bad-600 bg-bad-600/5" : "border-warn-600 bg-warn-600/5")}>
      <p className="font-reading text-lg">{t(`${kind}.help`, { max: money(refundableAgorot) })}</p>

      {kind === "REFUND" && (
        <div className="flex flex-col gap-1">
          <label htmlFor={amountId} className="font-medium">
            {t("amount")}
          </label>
          <input
            id={amountId}
            inputMode="decimal"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-12 w-40 rounded-lg px-3 text-lg tabular-nums ring-1 outline-none focus-visible:ring-2"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={reasonId} className="font-medium">
          {t("reason")}
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
          className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 rounded-lg p-3 text-base ring-1 outline-none focus-visible:ring-2"
        />
        <p className="text-char-700 text-sm">{t(`${kind}.reasonAudience`)}</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Button
          variant={kind === "CANCEL" ? "danger" : "primary"}
          size="lg"
          disabledReason={blocked}
          pendingLabel={pending ? t("working") : null}
          onClick={submit}
        >
          {t(`${kind}.confirm`, { amount: amountValid ? money(amountAgorot) : "" })}
        </Button>
        <Button variant="ghost" size="lg" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-bad-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
