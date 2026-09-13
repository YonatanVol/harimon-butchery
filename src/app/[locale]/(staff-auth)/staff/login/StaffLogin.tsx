"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { staffLogin } from "@/infra/staff/actions";
import { cx } from "@/ui/cx";

const PIN_LENGTH = 4;

export function StaffLogin({ members }: { members: Array<{ id: string; name: string; role: string }> }) {
  const t = useTranslations("staff.login");
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof members)[number] | null>(null);
  const [pin, setPinState] = useState("");
  // Fast typing delivers several keys before React re-renders; the ref always holds the latest code.
  const pinRef = useRef("");
  const setPin = (next: string | ((p: string) => string)) => {
    pinRef.current = typeof next === "function" ? next(pinRef.current) : next;
    setPinState(pinRef.current);
  };
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (code: string) => {
    if (!selected) return;
    start(async () => {
      const r = await staffLogin(selected.id, code);
      if (r.ok) {
        router.replace("/staff");
        router.refresh();
        return;
      }
      setPin("");
      setError(
        r.problem.key === "WRONG_PIN"
          ? t("WRONG_PIN", { attemptsLeft: r.problem.attemptsLeft })
          : r.problem.key === "LOCKED"
            ? t("LOCKED", { minutes: r.problem.minutes })
            : t("UNKNOWN"),
      );
    });
  };

  const press = (digit: string) => {
    if (pending || pinRef.current.length >= PIN_LENGTH) return;
    setError(null);
    const next = pinRef.current + digit;
    setPin(next);
    // The code is complete: sign in without asking for another tap.
    if (next.length === PIN_LENGTH) submit(next);
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Escape") {
        setSelected(null);
        setPin("");
        setError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!selected) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-bone-300 text-lg">{t("choose")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="bg-bone-50/5 ring-bone-50/15 hover:bg-bone-50/10 flex min-h-20 w-full flex-col items-start justify-center rounded-2xl px-5 text-start ring-1"
              >
                <span className="text-xl font-semibold">{m.name}</span>
                <span className="text-bone-300 text-sm">{m.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-2xl font-semibold">{t("pinFor", { name: selected.name })}</h2>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setPin("");
            setError(null);
          }}
          className="text-bone-300 min-h-11 text-sm underline-offset-4 hover:underline"
        >
          {t("back")}
        </button>
      </div>

      <div className="flex gap-4" aria-label={t("pinLabel")} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={cx("size-5 rounded-full ring-2", i < pin.length ? "bg-bone-50 ring-bone-50" : "ring-bone-300")} />
        ))}
      </div>
      <p role="alert" className={cx("min-h-6 text-center font-medium", error ? "text-[#ff9a8f]" : "text-bone-300")}>
        {pending ? t("entering") : error ?? ""}
      </p>

      <div className="grid grid-cols-3 gap-3" dir="ltr">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={pending}
            onClick={() => press(d)}
            className="bg-bone-50/10 hover:bg-bone-50/20 size-22 rounded-2xl text-3xl font-semibold tabular-nums disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setPin("")} disabled={pending} className="text-bone-300 size-22 rounded-2xl text-base">
          {t("clear")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => press("0")}
          className="bg-bone-50/10 hover:bg-bone-50/20 size-22 rounded-2xl text-3xl font-semibold tabular-nums disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((p) => p.slice(0, -1))}
          disabled={pending}
          aria-label={t("delete")}
          className="text-bone-300 size-22 rounded-2xl text-2xl"
        >
          ⌫
        </button>
      </div>
    </section>
  );
}
