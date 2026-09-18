import type { Metadata } from "next";
import { routing } from "./routing";

/**
 * The canonical address of a page and where its twin in the other language lives. Without these, Hebrew
 * and English versions of the same cut look to a search engine like two pages competing with each other.
 *
 * `path` is the page under the locale, starting with a slash ("/p/entrecote"), or "" for the home page.
 */
export function alternatesFor(locale: string, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      // Anyone whose language we don't publish gets the Hebrew shop, which is the shop.
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
