export const OCCASIONS = ["SHABBAT", "GRILL", "HOLIDAY", "SLOW_COOK", "WEEKNIGHT"] as const;
export type Occasion = (typeof OCCASIONS)[number];

const slugs: Record<Occasion, string> = {
  SHABBAT: "shabbat",
  GRILL: "grill",
  HOLIDAY: "holiday",
  SLOW_COOK: "slow-cook",
  WEEKNIGHT: "weeknight",
};

export const occasionSlug = (o: Occasion) => slugs[o];

export function occasionFromSlug(slug: string): Occasion | null {
  return (Object.entries(slugs).find(([, s]) => s === slug)?.[0] as Occasion | undefined) ?? null;
}
