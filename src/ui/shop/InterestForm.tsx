"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { joinAreaList, joinRestockList } from "@/infra/interest/actions";
import type { InterestProblem } from "@/infra/interest/signups";
import { Button } from "../primitives/Button";

type Target = { kind: "RESTOCK"; productId: string; productName: string } | { kind: "AREA"; city: string };

/** One phone number, one tap, one message when it happens — and the page says exactly that. */
export function InterestForm({ target }: { target: Target }) {
  const t = useTranslations("shop.interest");
  const locale = useLocale();
  const phoneId = useId();
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<null | "joined" | "already">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p role="status" className="bg-ok-600/10 text-ok-600 rounded-lg p-3 font-medium">
        {target.kind === "RESTOCK"
          ? t(done === "already" ? "restockAlready" : "restockJoined", { product: target.productName })
          : t(done === "already" ? "areaAlready" : "areaJoined", { city: target.city })}
      </p>
    );
  }

  return (
    <form
      className="bg-bone-100 flex flex-col gap-2 rounded-xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await (target.kind === "RESTOCK" ? joinRestockList(target.productId, phone, locale) : joinAreaList(target.city, phone, locale)).catch(() => null);
          if (!r) return setError(t("problems.NETWORK"));
          if (!r.ok) return setError(t(`problems.${(r.problem as InterestProblem).key}`));
          setDone(r.already ? "already" : "joined");
        });
      }}
    >
      <label htmlFor={phoneId} className="font-semibold">
        {target.kind === "RESTOCK" ? t("restockTitle") : t("areaTitle", { city: target.city })}
      </label>
      <p className="text-char-700 text-sm">{t("oneMessage")}</p>
      <div className="flex flex-wrap items-start gap-2">
        <input
          id={phoneId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-000-0000"
          className="bg-bone-50 focus:ring-wine-500 min-h-11 min-w-0 flex-1 rounded-lg border border-bone-300 px-3 text-start tabular-nums outline-none focus:ring-2"
        />
        <Button type="submit" variant="secondary" disabledReason={phone.replace(/\D/g, "").length < 9 ? t("phoneMissing") : null} pendingLabel={pending ? t("saving") : null}>
          {t("submit")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-bad-600 text-sm font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
