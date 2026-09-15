"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { OTP_LENGTH } from "@/domain/auth/otp";
import type { Locale } from "@/i18n/routing";
import { customerRequestCode, customerVerifyCode } from "@/infra/customer/actions";
import type { LoginProblem } from "@/infra/customer/login";
import { Button } from "../../primitives/Button";

type Sent = { phone: string; phoneE164: string; demoCode: string | null };

export function CustomerLogin() {
  const t = useTranslations("shop.account.login");
  const locale = useLocale() as Locale;
  const phoneId = useId();
  const codeId = useId();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const submittedCode = useRef<string | null>(null);

  // A visible countdown instead of a resend button that silently does nothing.
  useEffect(() => {
    if (!waitUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const secondsLeft = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;

  const problemText = (p: LoginProblem) => {
    switch (p.key) {
      case "WAIT":
        return t("problems.WAIT", { seconds: p.retryAfterSeconds });
      case "WRONG_CODE":
        return t("problems.WRONG_CODE", { attemptsLeft: p.attemptsLeft });
      default:
        return t(`problems.${p.key}`);
    }
  };

  const send = (target: string) => {
    setError(null);
    setBusy("send");
    start(async () => {
      const r = await customerRequestCode(target, locale).catch(() => null);
      setBusy(null);
      if (!r) return setError(t("problems.NETWORK"));
      if (!r.ok) {
        if (r.problem.key === "WAIT") setWaitUntil(Date.now() + r.problem.retryAfterSeconds * 1000);
        return setError(problemText(r.problem));
      }
      setSent({ phone: target, phoneE164: r.phoneE164, demoCode: r.demoCode });
      setCode("");
      submittedCode.current = null;
      setWaitUntil(Date.now() + 30_000);
      setNow(Date.now());
      requestAnimationFrame(() => codeRef.current?.focus());
    });
  };

  const verify = (value: string) => {
    if (!sent || submittedCode.current === value) return;
    submittedCode.current = value;
    setError(null);
    setBusy("verify");
    start(async () => {
      const r = await customerVerifyCode(sent.phoneE164, value).catch(() => null);
      setBusy(null);
      if (!r) {
        submittedCode.current = null;
        return setError(t("problems.NETWORK"));
      }
      if (!r.ok) {
        setCode("");
        submittedCode.current = null;
        setError(problemText(r.problem));
        codeRef.current?.focus();
      }
    });
  };

  if (!sent) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(phone);
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={phoneId} className="font-medium">
            {t("phone")}
          </label>
          <input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-000-0000"
            className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-14 rounded-[3px] px-4 text-start text-xl tabular-nums ring-1 outline-none focus-visible:ring-2"
          />
          <p className="text-char-700 text-sm">{t("phoneHelp")}</p>
        </div>
        <Button
          type="submit"
          size="lg"
          disabledReason={phone.replace(/\D/g, "").length < 9 ? t("phoneMissing") : secondsLeft > 0 ? t("problems.WAIT", { seconds: secondsLeft }) : null}
          pendingLabel={pending && busy === "send" ? t("sending") : null}
        >
          {t("sendCode")}
        </Button>
        {error && (
          <p role="alert" className="text-bad-600 font-medium">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sent.demoCode && (
        <p className="bg-warn-600/10 ring-warn-600/30 rounded-[3px] p-3 ring-1" role="status">
          {t("demoCode")} <bdi dir="ltr" className="font-bold tracking-widest tabular-nums">{sent.demoCode}</bdi>
        </p>
      )}
      <p className="font-reading text-lg">
        {t("sentTo")} <bdi dir="ltr" className="font-semibold tabular-nums">{sent.phone}</bdi>
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor={codeId} className="font-medium">
          {t("code")}
        </label>
        <input
          ref={codeRef}
          id={codeId}
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={OTP_LENGTH}
          value={code}
          disabled={pending && busy === "verify"}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
            setCode(digits);
            // Pasted, typed or autofilled — the sixth digit signs in without another tap.
            if (digits.length === OTP_LENGTH) verify(digits);
          }}
          className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 min-h-16 w-full max-w-xs rounded-[3px] px-4 text-center text-3xl tracking-[0.5em] tabular-nums ring-1 outline-none focus-visible:ring-2"
        />
        <p className="text-char-700 text-sm" aria-live="polite">
          {pending && busy === "verify" ? t("verifying") : t("codeHelp")}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-bad-600 font-medium">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-start gap-3">
        <Button
          variant="secondary"
          disabledReason={secondsLeft > 0 ? t("resendIn", { seconds: secondsLeft }) : null}
          pendingLabel={pending && busy === "send" ? t("sending") : null}
          onClick={() => send(sent.phone)}
        >
          {t("resend")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSent(null);
            setError(null);
          }}
        >
          {t("changePhone")}
        </Button>
      </div>
    </div>
  );
}
