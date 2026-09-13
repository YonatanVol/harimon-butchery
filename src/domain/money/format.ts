import type { Agorot } from "./agorot";

type AppLocale = "he" | "en";

const intlLocale: Record<AppLocale, string> = { he: "he-IL", en: "en-IL" };

const formatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(locale: AppLocale, fractionDigits: 0 | 2) {
  const key = `${locale}:${fractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale[locale], {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Whole-shekel amounts print without decimals ("169 ₪"); anything else prints two decimals
 * ("129.90 ₪") — never a lone "129.9".
 */
export function formatAgorot(value: Agorot, locale: AppLocale): string {
  const fractionDigits = value % 100 === 0 ? 0 : 2;
  return currencyFormatter(locale, fractionDigits).format(value / 100);
}
