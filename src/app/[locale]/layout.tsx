import type { Metadata, Viewport } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { brand } from "@/config/brand";
import { localeDirection, routing } from "@/i18n/routing";
import "../globals.css";

const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500"],
  variable: "--font-frank",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Content runs under the iPhone notch and home indicator; the shell pads itself with safe-area insets.
  viewportFit: "cover",
  themeColor: "#f3f0ea",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = hasLocale(routing.locales, locale) ? brand.name[locale] : brand.name.he;
  return { title: { default: t("title"), template: `%s · ${name}` }, description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "demo" });

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`${frank.variable} ${assistant.variable}`}
    >
      <body className="min-h-dvh">
        {brand.isDemo && (
          <div
            role="note"
            className="bg-char-900 text-bone-100 py-1 text-center text-xs tracking-wide"
          >
            {t("ribbon")}
          </div>
        )}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
