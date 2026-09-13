"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { WeighingProblem } from "@/infra/orders/weighing";
import { staffReconcileCapture } from "@/infra/orders/staffActions";
import { Button } from "../primitives/Button";

/** For an order whose charge never came back: one button that finds out, and records, what really happened. */
export function StuckCapture({ orderId, blockedReason }: { orderId: string; blockedReason: string | null }) {
  const t = useTranslations("staff.order");
  const tp = useTranslations("staff.pack");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  return (
    <section className="border-warn-600 bg-warn-600/10 flex flex-col items-start gap-3 rounded-2xl border-s-8 p-5">
      <h2 className="text-lg font-bold">{t("stuckTitle")}</h2>
      <p>{t("stuckHelp")}</p>
      <Button
        disabledReason={blockedReason}
        pendingLabel={pending ? tp("saving") : null}
        onClick={() =>
          start(async () => {
            const r = await staffReconcileCapture(orderId).catch(() => null);
            if (!r) return setMessage({ tone: "bad", text: tp("problems.NETWORK") });
            if (!r.ok) {
              const p = r.problem as WeighingProblem;
              return setMessage({ tone: "bad", text: p.key === "CAPTURE_FAILED" ? `${tp("captureFailedTitle")}: ${tp(`captureReasons.${p.reason}` as never)}` : tp(`problems.${p.key}` as never) });
            }
            setMessage({ tone: "ok", text: t("stuckDone") });
          })
        }
      >
        {t("stuckCheck")}
      </Button>
      {message && (
        <p role={message.tone === "bad" ? "alert" : "status"} className={message.tone === "bad" ? "text-bad-600 font-medium" : "text-ok-600 font-medium"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
