"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { customerCancel, customerDecideExtra, customerReschedule } from "@/infra/orders/customerActions";
import { staffMoveDelivery } from "@/infra/orders/staffActions";
import { tidyRelative } from "@/i18n/relativeTime";
import { cx } from "../../cx";
import { Button } from "../../primitives/Button";

type Problem = { key: string };

function useProblem() {
  const t = useTranslations("tracking.actions.problems");
  return (p: Problem | null | undefined) => (p ? t(p.key as never) : t("NETWORK"));
}

export function ExtraApproval({
  orderNumber,
  token,
  productName,
  actualWeight,
  requestedWeight,
  trimmedWeight,
  extraAmount,
  deadline,
}: {
  orderNumber: string;
  token: string;
  productName: string;
  actualWeight: string;
  requestedWeight: string;
  trimmedWeight: string;
  extraAmount: string;
  deadline: string;
}) {
  const t = useTranslations("tracking.actions");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const problemText = useProblem();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState<"APPROVE" | "TRIM" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deadlineDate = new Date(deadline);

  const decide = (decision: "APPROVE" | "TRIM") => {
    setChoice(decision);
    setError(null);
    start(async () => {
      const r = await customerDecideExtra({ orderNumber, token, decision }).catch(() => null);
      if (!r?.ok) setError(problemText(r && !r.ok ? r.problem : null));
    });
  };

  return (
    <section id="approve-extra" className="border-warn-600 bg-warn-600/10 scroll-mt-32 rounded-2xl border-s-8 p-5">
      <h2 className="text-xl font-bold">{t("extraTitle", { product: productName })}</h2>
      <p className="font-reading mt-1 text-lg">{t("extraBody", { actual: actualWeight, requested: requestedWeight, extra: extraAmount })}</p>
      <p className="text-char-700 mt-1 text-sm">
        {t("extraDeadline", { time: format.dateTime(deadlineDate, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), relative: tidyRelative(format.relativeTime(deadlineDate, now)), trimmed: trimmedWeight })}
      </p>
      <p className="text-char-700 mt-1 text-sm">{t("extraSeparate")}</p>
      <div id="trim" className="mt-4 flex flex-wrap gap-3">
        <Button size="lg" pendingLabel={pending && choice === "APPROVE" ? t("working") : null} onClick={() => decide("APPROVE")}>
          {t("approveExtra", { extra: extraAmount })}
        </Button>
        <Button size="lg" variant="secondary" pendingLabel={pending && choice === "TRIM" ? t("working") : null} onClick={() => decide("TRIM")}>
          {t("trimTo", { weight: trimmedWeight })}
        </Button>
      </div>
      {error && <p role="alert" className="text-bad-600 mt-3 font-medium">{error}</p>}
    </section>
  );
}

export function CancelOrder({ orderNumber, token }: { orderNumber: string; token: string }) {
  const t = useTranslations("tracking.actions");
  const problemText = useProblem();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="bg-bone-100 rounded-2xl p-5">
      <h2 className="font-semibold">{t("cancelTitle")}</h2>
      <p className="text-char-700 text-sm">{t("cancelBody")}</p>
      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-medium">{t("cancelConfirm")}</span>
          <Button
            variant="danger"
            pendingLabel={pending ? t("working") : null}
            onClick={() =>
              start(async () => {
                const r = await customerCancel({ orderNumber, token }).catch(() => null);
                if (!r?.ok) setError(problemText(r && !r.ok ? r.problem : null));
              })
            }
          >
            {t("cancelYes")}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t("cancelNo")}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" className="mt-3" onClick={() => setConfirming(true)}>
          {t("cancelOrder")}
        </Button>
      )}
      {error && <p role="alert" className="text-bad-600 mt-2 font-medium">{error}</p>}
    </section>
  );
}

type RescheduleTarget = { by: "customer"; orderNumber: string; token: string } | { by: "staff"; orderId: string };

export function Reschedule({ target, windows }: { target: RescheduleTarget; windows: Array<{ id: string; startsAt: string; endsAt: string }> }) {
  const t = useTranslations("tracking.actions");
  const format = useFormatter();
  const problemText = useProblem();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  return (
    <section id="reschedule" className="border-wine-600 bg-wine-600/5 scroll-mt-32 rounded-2xl border-s-8 p-5">
      <h2 className="text-xl font-bold">{t(target.by === "staff" ? "rescheduleTitleStaff" : "rescheduleTitle")}</h2>
      <p className="font-reading text-char-700 mt-1">{t(target.by === "staff" ? "rescheduleBodyStaff" : "rescheduleBody")}</p>
      {windows.length === 0 ? (
        <p className="mt-3 font-medium">{t(target.by === "staff" ? "rescheduleNoneStaff" : "rescheduleNone")}</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {windows.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPicked(w.id);
                  setError(null);
                  start(async () => {
                    const r = await (target.by === "customer"
                      ? customerReschedule({ orderNumber: target.orderNumber, token: target.token, slotId: w.id })
                      : staffMoveDelivery(target.orderId, w.id)
                    ).catch(() => null);
                    if (!r?.ok) setError(problemText(r && !r.ok ? r.problem : null));
                  });
                }}
                className={cx(
                  "bg-bone-50 ring-bone-300 hover:bg-bone-100 flex min-h-16 w-full flex-col items-start justify-center rounded-xl px-4 text-start ring-1 disabled:opacity-60",
                  picked === w.id && "ring-wine-600 ring-2",
                )}
              >
                <span className="font-semibold">{format.dateTime(new Date(w.startsAt), { weekday: "long", day: "numeric", month: "numeric" })}</span>
                <bdi dir="ltr" className="tabular-nums">
                  {time(w.startsAt)}–{time(w.endsAt)}
                </bdi>
                {pending && picked === w.id && <span className="text-sm">{t("working")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-bad-600 mt-3 font-medium">{error}</p>}
    </section>
  );
}
