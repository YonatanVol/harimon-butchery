import { getFormatter, getTranslations } from "next-intl/server";
import type { kashrutAuthority, productKashrut } from "@/infra/db/schema";
import { cx } from "../cx";

type Kashrut = typeof productKashrut.$inferSelect;
type Authority = typeof kashrutAuthority.$inferSelect;

const DAY = 86_400_000;

/** Certificate state is stated plainly, including when it is close to or past expiry. */
export function certificateState(validUntil: string, now = new Date()): "valid" | "expiresSoon" | "expired" {
  const end = new Date(`${validUntil}T23:59:59+03:00`).getTime();
  if (end < now.getTime()) return "expired";
  if (end - now.getTime() < 30 * DAY) return "expiresSoon";
  return "valid";
}

export async function KashrutPanel({ kashrut, authority, locale }: { kashrut: Kashrut; authority: Authority; locale: "he" | "en" }) {
  const t = await getTranslations("shop.kashrut");
  const format = await getFormatter();
  const state = certificateState(authority.certificateValidUntil);
  const date = format.dateTime(new Date(`${authority.certificateValidUntil}T12:00:00Z`), { dateStyle: "medium" });

  const rows: Array<[string, string]> = [
    [t("authority"), locale === "he" ? authority.nameHe : authority.nameEn],
    [t("glattLabel"), t(kashrut.glatt)],
    [t("shechita"), t(kashrut.shechita)],
    [t("nikur"), kashrut.nikur === "NOT_APPLICABLE" ? t("notApplicable") : t(kashrut.nikur)],
    [t("salting"), kashrut.salted === "NOT_APPLICABLE" ? t("notApplicable") : t(kashrut.salted)],
    [t("passover"), t(kashrut.passover)],
  ];

  return (
    <section aria-labelledby="kashrut-title" className="border-bone-300 border-t pt-5">
      <h2 id="kashrut-title" className="font-display text-xl">
        {t("panelTitle")}
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-char-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
        <dt className="text-char-500">{t("certificate")}</dt>
        <dd
          className={cx(
            "font-medium",
            state === "expired" && "text-bad-600",
            state === "expiresSoon" && "text-warn-600",
          )}
        >
          <bdi className="tabular-nums">{authority.certificateNumber}</bdi> ·{" "}
          {state === "expired" ? t("expired", { date }) : state === "expiresSoon" ? t("expiresSoon", { date }) : t("validUntil", { date })}
        </dd>
      </dl>
      {authority.isFictional && <p className="text-char-500 mt-3 text-xs">{t("fictional")}</p>}
    </section>
  );
}
