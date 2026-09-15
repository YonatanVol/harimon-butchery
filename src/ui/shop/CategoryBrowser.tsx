"use client";

import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cx } from "../cx";

export interface BrowsableItem {
  id: string;
  node: ReactNode;
  name: string;
  sortOrder: number;
  price: number; // agorot per kg or per bundle
  authority: string;
  authorityLabel: string;
  chalak: boolean;
  passover: boolean;
  inStock: boolean;
}

type Sort = "recommended" | "priceAsc" | "priceDesc" | "name";

interface Filters {
  authorities: string[];
  chalak: boolean;
  passover: boolean;
  inStock: boolean;
}

const EMPTY: Filters = { authorities: [], chalak: false, passover: false, inStock: false };

function readUrl(): { filters: Filters; sort: Sort } {
  const p = new URLSearchParams(window.location.search);
  const sort = p.get("sort");
  return {
    filters: {
      authorities: p.getAll("authority"),
      chalak: p.get("chalak") === "1",
      passover: p.get("pesach") === "1",
      inStock: p.get("instock") === "1",
    },
    sort: sort === "priceAsc" || sort === "priceDesc" || sort === "name" ? sort : "recommended",
  };
}

function writeUrl(filters: Filters, sort: Sort) {
  const p = new URLSearchParams();
  filters.authorities.forEach((a) => p.append("authority", a));
  if (filters.chalak) p.set("chalak", "1");
  if (filters.passover) p.set("pesach", "1");
  if (filters.inStock) p.set("instock", "1");
  if (sort !== "recommended") p.set("sort", sort);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

/** Filtering and sorting happen in the browser: instant, and the page itself stays static. */
export function CategoryBrowser({ items }: { items: BrowsableItem[] }) {
  const t = useTranslations("shop.category");
  const locale = useLocale();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort>("recommended");

  useEffect(() => {
    const fromUrl = readUrl();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from the URL
    setFilters(fromUrl.filters);
    setSort(fromUrl.sort);
  }, []);

  const update = (next: Filters, nextSort = sort) => {
    setFilters(next);
    setSort(nextSort);
    writeUrl(next, nextSort);
  };

  const authorities = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => seen.set(i.authority, i.authorityLabel));
    return [...seen.entries()];
  }, [items]);

  const visible = useMemo(() => {
    const collator = new Intl.Collator(locale === "he" ? "he-IL" : "en-IL");
    const filtered = items.filter(
      (i) =>
        (filters.authorities.length === 0 || filters.authorities.includes(i.authority)) &&
        (!filters.chalak || i.chalak) &&
        (!filters.passover || i.passover) &&
        (!filters.inStock || i.inStock),
    );
    const sorted = [...filtered];
    if (sort === "priceAsc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name") sorted.sort((a, b) => collator.compare(a.name, b.name));
    else sorted.sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted;
  }, [items, filters, sort, locale]);

  const active = filters.authorities.length > 0 || filters.chalak || filters.passover || filters.inStock;
  const nearest = items.filter((i) => i.inStock).slice(0, 2);

  const toggle = (key: "chalak" | "passover" | "inStock", label: string) => (
    <button
      type="button"
      aria-pressed={filters[key]}
      onClick={() => update({ ...filters, [key]: !filters[key] })}
      className={cx(
        "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors",
        filters[key] ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300 hover:bg-bone-100",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("filters")}>
        {authorities.length > 1 &&
          authorities.map(([slug, label]) => {
            const on = filters.authorities.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  update({
                    ...filters,
                    authorities: on ? filters.authorities.filter((a) => a !== slug) : [...filters.authorities, slug],
                  })
                }
                className={cx(
                  "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors",
                  on ? "bg-char-900 text-bone-50 ring-char-900" : "bg-bone-50 ring-bone-300 hover:bg-bone-100",
                )}
              >
                {label}
              </button>
            );
          })}
        {toggle("chalak", t("filterGlatt"))}
        {toggle("passover", t("filterPassover"))}
        {toggle("inStock", t("filterInStock"))}
        {active && (
          <button
            type="button"
            onClick={() => update(EMPTY)}
            className="text-wine-600 min-h-10 px-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("clear")}
          </button>
        )}
        <label className="ms-auto flex items-center gap-2 text-sm">
          <span className="text-char-700">{t("sort")}</span>
          <select
            value={sort}
            onChange={(e) => update(filters, e.target.value as Sort)}
            className="bg-bone-50 min-h-10 rounded-[2px] border border-bone-300 px-3"
          >
            <option value="recommended">{t("sortRecommended")}</option>
            <option value="priceAsc">{t("sortPriceAsc")}</option>
            <option value="priceDesc">{t("sortPriceDesc")}</option>
            <option value="name">{t("sortName")}</option>
          </select>
        </label>
      </div>

      <p className="text-char-700 text-sm" aria-live="polite">
        {t("resultCount", { count: visible.length })}
      </p>

      {visible.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((i) => (
            <li key={i.id} className="flex">
              {i.node}
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-bone-100 flex flex-col items-start gap-4 rounded-[3px] p-6">
          <p className="text-lg font-semibold">{t("noResults")}</p>
          <button
            type="button"
            onClick={() => update(EMPTY)}
            className="bg-char-900 text-bone-50 min-h-11 rounded-[2px] px-5 text-sm font-medium"
          >
            {t("clear")}
          </button>
          {nearest.length > 0 && (
            <div className="flex w-full flex-col gap-3 pt-2">
              <p className="text-char-700 text-sm">{t("nearest")}</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {nearest.map((i) => (
                  <li key={i.id} className="flex">
                    {i.node}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
