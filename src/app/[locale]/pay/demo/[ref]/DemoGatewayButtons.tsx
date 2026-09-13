"use client";

import { useState, useTransition } from "react";
import { decideDemoPayment } from "@/infra/orders/actions";
import type { MockScenario } from "@/infra/payments/mock";

export function DemoGatewayButtons({
  pageRef,
  decided,
  scenarios,
  chooseLabel,
  cancelLabel,
  processingLabel,
}: {
  pageRef: string;
  decided: boolean;
  scenarios: Array<{ id: MockScenario; label: string; card: string }>;
  chooseLabel: string;
  cancelLabel: string;
  processingLabel: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const go = (scenario: MockScenario | "CANCEL") => {
    setBusy(scenario);
    start(async () => {
      const r = await decideDemoPayment(pageRef, scenario);
      if (r) window.location.assign(r.returnUrl);
      else setBusy(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {!decided && <p className="text-sm font-semibold text-[#52606d]">{chooseLabel}</p>}
      {!decided &&
        scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy !== null}
            onClick={() => go(s.id)}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#d9e2ec] px-4 text-start hover:bg-[#f5f7fa] disabled:opacity-60"
          >
            <span className="font-medium">{busy === s.id ? processingLabel : s.label}</span>
            <bdi dir="ltr" className="text-sm text-[#52606d] tabular-nums">
              {s.card}
            </bdi>
          </button>
        ))}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => go("CANCEL")}
        className="min-h-11 text-sm font-medium text-[#52606d] underline-offset-4 hover:underline disabled:opacity-60"
      >
        {busy === "CANCEL" ? processingLabel : cancelLabel}
      </button>
    </div>
  );
}
