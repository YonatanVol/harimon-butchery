"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { OrderEvent } from "@/domain/order/machine";
import { staffDriverAction } from "@/infra/orders/staffActions";
import { Button } from "../primitives/Button";

const NEXT: Record<string, Array<{ event: OrderEvent; variant: "primary" | "secondary" | "danger" }>> = {
  PACKED: [{ event: "DISPATCHED", variant: "primary" }],
  RESCHEDULED: [{ event: "DISPATCHED", variant: "primary" }],
  OUT_FOR_DELIVERY: [
    { event: "DELIVERED", variant: "primary" },
    { event: "NOT_HOME", variant: "secondary" },
    { event: "REFUSED", variant: "danger" },
  ],
  DELIVERY_FAILED_NOT_HOME: [{ event: "RETURNED_TO_SHOP", variant: "secondary" }],
};

/** The one or three things a driver can do next, big enough for a phone held in one hand. */
export function DriverButtons({ orderId, status, blockedReason }: { orderId: string; status: string; blockedReason: string | null }) {
  const t = useTranslations("staff.deliveries");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<OrderEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = NEXT[status] ?? [];
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.event}
            size="lg"
            variant={o.variant}
            disabledReason={blockedReason}
            pendingLabel={pending && busy === o.event ? t("working") : null}
            onClick={() => {
              setBusy(o.event);
              setError(null);
              start(async () => {
                const r = await staffDriverAction(orderId, o.event).catch(() => null);
                if (!r) setError(t("problems.NETWORK"));
                else if (!r.ok) setError(t(`problems.${r.problem.key === "WRONG_STATE" || r.problem.key === "NOT_PERMITTED" ? r.problem.key : "WRONG_STATE"}`));
              });
            }}
          >
            {t(`events.${o.event}`)}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-bad-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
