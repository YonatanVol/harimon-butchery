import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import type { Locale } from "@/i18n/routing";
import { db } from "@/infra/db/client";
import { mockPspTransaction } from "@/infra/db/schema";
import { MOCK_SCENARIOS } from "@/infra/payments/mock";
import { DemoGatewayButtons } from "./DemoGatewayButtons";

export async function generateMetadata({ params }: PageProps<"/[locale]/pay/demo/[ref]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pay" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * Stands in for a real processor's hosted page. It is deliberately unbranded and labelled as a demo,
 * and it has no card-number fields — test cards are chosen by scenario.
 */
export default async function DemoGatewayPage({ params }: PageProps<"/[locale]/pay/demo/[ref]">) {
  const { locale: raw, ref } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("pay");
  const [tx] = /^mock_[A-Za-z0-9_-]{8,40}$/.test(ref) ? await db.select().from(mockPspTransaction).where(eq(mockPspTransaction.ref, ref)) : [];

  return (
    <main className="bg-[#eef1f5] min-h-dvh px-4 py-10 text-[#1f2933]">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <p role="note" className="rounded-lg bg-[#fff4d6] px-4 py-2 text-center text-sm font-medium text-[#7a5b00]">
          {t("demoBanner")}
        </p>
        <section className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between border-b border-[#e3e8ee] pb-4">
            <span className="text-sm font-semibold text-[#52606d]">{t("title")}</span>
            <svg viewBox="0 0 24 24" className="size-5 text-[#3e7c55]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </header>
          {!tx ? (
            <p className="font-medium">{t("notFound")}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-[#52606d]">{t("merchant")}</dt>
                <dd className="text-end">{t("order", { number: tx.orderNumber })}</dd>
                <dt className="text-[#52606d]">{tx.mode === "AUTHORIZE" ? t("modeAuthorize") : t("modeCharge")}</dt>
                <dd className="text-end text-2xl font-bold tabular-nums">
                  <bdi>{formatAgorot(agorot(tx.amountAgorot), locale)}</bdi>
                </dd>
              </dl>
              {tx.status !== "CREATED" ? (
                <p className="rounded-lg bg-[#eef1f5] p-3 text-sm">{t("alreadyDecided")}</p>
              ) : null}
              <DemoGatewayButtons
                pageRef={tx.ref}
                decided={tx.status !== "CREATED"}
                scenarios={MOCK_SCENARIOS.map((s) => ({ id: s.id, label: t(`scenario.${s.id}`), card: `${s.brand} •••• ${s.last4}` }))}
                chooseLabel={t("chooseCard")}
                cancelLabel={t("cancel")}
                processingLabel={t("processing")}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
