"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { type CheckoutDetails, type DetailsErrors, validateDetails } from "@/domain/checkout/details";
import { formatAgorot } from "@/domain/money/format";
import { agorot } from "@/domain/money/agorot";
import type { Locale } from "@/i18n/routing";
import { submitCheckout } from "@/infra/orders/actions";
import type { PlaceOrderProblem } from "@/infra/orders/placeOrder";
import { cx } from "../../cx";
import { Button } from "../../primitives/Button";
import { useProblemText } from "../useProblemText";

const EMPTY: CheckoutDetails = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  street: "",
  houseNumber: "",
  entrance: "",
  floor: "",
  apartment: "",
  intercom: "",
  deliveryNotes: "",
};

export function CheckoutForm({
  draft,
  city,
  submitLabel,
}: {
  draft: Partial<CheckoutDetails> | null;
  city: string;
  submitLabel: string;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale() as Locale;
  const problemText = useProblemText();
  const [values, setValues] = useState<CheckoutDetails>({ ...EMPTY, ...(draft ?? {}) });
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutDetails, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<DetailsErrors>({});
  const [formProblem, setFormProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const problemRef = useRef<HTMLParagraphElement>(null);

  const check = validateDetails(values);
  const liveErrors: DetailsErrors = check.ok ? {} : check.errors;
  const errorFor = (k: keyof CheckoutDetails) => serverErrors[k] ?? (touched[k] ? liveErrors[k] : undefined);

  const set = (k: keyof CheckoutDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setServerErrors((s) => ({ ...s, [k]: undefined }));
  };

  const describeProblem = (p: PlaceOrderProblem): string => {
    switch (p.key) {
      case "LINE_CHANGED":
        return t("problems.LINE_CHANGED", { product: locale === "he" ? p.productNameHe : p.productNameEn, problem: problemText(p.problem) });
      case "BELOW_MINIMUM":
        return t("problems.BELOW_MINIMUM", { amount: formatAgorot(agorot(p.gapAgorot), locale) });
      default:
        return t(`problems.${p.key}`);
    }
  };

  const submit = () => {
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (!check.ok) {
      setFormProblem(t("problems.DETAILS_INVALID"));
      requestAnimationFrame(() => problemRef.current?.focus());
      return;
    }
    setFormProblem(null);
    start(async () => {
      try {
        const r = await submitCheckout(values, locale);
        if (r.ok) {
          setRedirecting(true);
          window.location.assign(r.redirectUrl);
          return;
        }
        if (r.problem.key === "DETAILS_INVALID") setServerErrors(r.problem.errors);
        setFormProblem(describeProblem(r.problem));
        requestAnimationFrame(() => problemRef.current?.focus());
      } catch {
        setFormProblem(problemText({ key: "NETWORK" }));
      }
    });
  };

  const field = (k: keyof CheckoutDetails, opts: { label: string; autoComplete?: string; inputMode?: "tel" | "email" | "numeric" | "text"; hint?: string; className?: string; dir?: "ltr" }) => {
    const err = errorFor(k);
    const id = `co-${k}`;
    return (
      <label className={cx("flex flex-col gap-1", opts.className)} htmlFor={id}>
        <span className="text-char-700 text-sm font-medium">{opts.label}</span>
        <input
          id={id}
          name={k}
          value={values[k]}
          onChange={set(k)}
          onBlur={() => setTouched((x) => ({ ...x, [k]: true }))}
          autoComplete={opts.autoComplete}
          inputMode={opts.inputMode}
          dir={opts.dir}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-err` : opts.hint ? `${id}-hint` : undefined}
          className={cx(
            "bg-bone-50 min-h-12 rounded-lg border px-3 text-base outline-none focus:ring-2",
            err ? "border-bad-600 focus:ring-bad-600" : "border-bone-300 focus:ring-wine-500",
            opts.dir === "ltr" && "text-end",
          )}
        />
        {err ? (
          <span id={`${id}-err`} className="text-bad-600 text-sm">
            {t(`errors.${err}`)}
          </span>
        ) : opts.hint ? (
          <span id={`${id}-hint`} className="text-char-500 text-xs">
            {opts.hint}
          </span>
        ) : null}
      </label>
    );
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-8"
    >
      {formProblem && (
        <p ref={problemRef} tabIndex={-1} role="alert" className="bg-bad-600/10 text-bad-600 rounded-xl p-4 font-medium outline-none">
          {formProblem}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-xl font-bold">{t("contactTitle")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("firstName", { label: t("firstName"), autoComplete: "given-name" })}
          {field("lastName", { label: t("lastName"), autoComplete: "family-name" })}
          {field("phone", { label: t("phone"), autoComplete: "tel", inputMode: "tel", hint: t("phoneHint"), dir: "ltr" })}
          {field("email", { label: t("email"), autoComplete: "email", inputMode: "email", dir: "ltr" })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-xl font-bold">{t("addressTitle")}</legend>
        <div className="bg-bone-100 flex items-center justify-between rounded-lg px-3 py-2">
          <span>
            <span className="text-char-500 text-sm">{t("city")}: </span>
            <span className="font-medium">{city}</span>
          </span>
          <a href={`/${locale}/cart`} className="text-wine-600 min-h-11 content-center text-sm font-medium underline-offset-4 hover:underline">
            {t("changeCity")}
          </a>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {field("street", { label: t("street"), autoComplete: "address-line1", className: "col-span-4" })}
          {field("houseNumber", { label: t("houseNumber"), className: "col-span-2" })}
          {field("entrance", { label: t("entrance"), className: "col-span-2" })}
          {field("floor", { label: t("floor"), inputMode: "numeric", className: "col-span-2" })}
          {field("apartment", { label: t("apartment"), className: "col-span-2" })}
          {field("intercom", { label: t("intercom"), className: "col-span-3", dir: "ltr" })}
        </div>
        <label className="flex flex-col gap-1" htmlFor="co-deliveryNotes">
          <span className="text-char-700 text-sm font-medium">{t("deliveryNotes")}</span>
          <textarea
            id="co-deliveryNotes"
            value={values.deliveryNotes}
            onChange={set("deliveryNotes")}
            maxLength={300}
            rows={2}
            placeholder={t("deliveryNotesPlaceholder")}
            className="bg-bone-50 focus:ring-wine-500 rounded-lg border border-bone-300 p-3 outline-none focus:ring-2"
          />
        </label>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" fullWidth pendingLabel={pending || redirecting ? t("submitting") : null}>
          {submitLabel}
        </Button>
        <p className="text-char-500 flex items-start gap-2 text-sm">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {t("secureNote")}
        </p>
      </div>
    </form>
  );
}

