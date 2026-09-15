import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { agorot } from "@/domain/money/agorot";
import { formatAgorot } from "@/domain/money/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { loadOrderHistory } from "@/infra/customer/history";
import { currentCustomerPhone } from "@/infra/customer/session";
import { Badge } from "@/ui/primitives/Badge";
import { CustomerLogin } from "@/ui/shop/account/CustomerLogin";
import { SignOutButton } from "@/ui/shop/account/SignOutButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop.account" });
  return { title: t("title"), robots: { index: false } };
}

const DONE = ["DELIVERED", "CLOSED", "REFUNDED", "PARTIALLY_REFUNDED"];
const STOPPED = ["AUTH_DECLINED", "AUTH_EXPIRED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_SHOP"];
const NEEDS_YOU = ["AWAITING_CUSTOMER_APPROVAL", "DELIVERY_FAILED_NOT_HOME", "AUTH_PENDING"];

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("shop.account");
  const status = await getTranslations("tracking.status");
  const format = await getFormatter();
  const phone = await currentCustomerPhone();

  if (!phone) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="font-display text-4xl font-light md:text-5xl">{t("login.title")}</h1>
          <p className="font-reading text-char-700 mt-2 text-lg">{t("login.body")}</p>
        </div>
        <CustomerLogin />
      </div>
    );
  }

  const orders = await loadOrderHistory(phone);
  const money = (a: number) => formatAgorot(agorot(a), locale);
  const display = phone.replace(/^\+972/, "0").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-light md:text-5xl">{orders[0] ? t("hello", { name: orders[0].firstName }) : t("title")}</h1>
          <p className="text-char-700 mt-1">
            {t("signedInAs")} <bdi dir="ltr" className="tabular-nums">{display}</bdi>
          </p>
        </div>
        <SignOutButton />
      </header>

      {orders.length === 0 ? (
        <section className="bg-bone-100 flex flex-col items-start gap-4 rounded-[3px] p-8">
          <h2 className="text-2xl font-bold">{t("emptyTitle")}</h2>
          <p className="font-reading text-char-700 text-lg">{t("emptyBody")}</p>
          <Link href="/" className="bg-char-900 text-bone-50 inline-flex min-h-12 items-center rounded-[2px] px-6 font-medium">
            {t("startShopping")}
          </Link>
        </section>
      ) : (
        <section aria-labelledby="orders-title">
          <h2 id="orders-title" className="text-xl font-bold">
            {t("ordersTitle")}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {orders.map((o) => {
              const amount =
                o.capturedAgorot != null
                  ? t("charged", { amount: money(o.capturedAgorot - o.refundedAgorot) })
                  : STOPPED.includes(o.status)
                    ? t("notCharged")
                    : t("held", { amount: money(o.authorizationCeilingAgorot) });
              return (
                <li key={o.orderNumber}>
                  <Link
                    href={`/orders/${o.orderNumber}?t=${o.accessToken}`}
                    className="bg-bone-50 ring-bone-300 hover:ring-char-900 flex flex-wrap items-center justify-between gap-3 rounded-[3px] p-5 ring-1"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tabular-nums">{o.orderNumber}</span>
                        <Badge tone={NEEDS_YOU.includes(o.status) ? "warn" : DONE.includes(o.status) ? "ok" : STOPPED.includes(o.status) ? "neutral" : "wine"}>
                          {status(o.status as never)}
                        </Badge>
                      </div>
                      <span className="text-char-700 text-sm">
                        {t("placed", { date: format.dateTime(o.createdAt, { day: "numeric", month: "long", year: "numeric" }), count: o.lineCount })}
                        {o.startsAt && o.endsAt && (
                          <>
                            {" · "}
                            {format.dateTime(o.startsAt, { weekday: "long", day: "numeric", month: "numeric" })}{" "}
                            <bdi dir="ltr">
                              {format.dateTime(o.startsAt, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}–
                              {format.dateTime(o.endsAt, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                            </bdi>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{amount}</span>
                      <span className="text-wine-700 text-sm font-medium">
                        {NEEDS_YOU.includes(o.status) ? t("actionNeeded") : t("details")} <span aria-hidden>{locale === "he" ? "←" : "→"}</span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
