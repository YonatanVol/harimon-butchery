/**
 * Where each cut comes from on the animal, for the cut maps on product pages and the cut guide.
 * Pure data: region ids are drawn by `src/ui/shop/CutMap.tsx`, named in `shop.cuts.region.*` messages.
 */

export const CUT_ANIMALS = ["BEEF", "LAMB", "CHICKEN", "TURKEY"] as const;
export type CutAnimal = (typeof CUT_ANIMALS)[number];

export const REGIONS = {
  BEEF: ["head", "neck", "chuck", "rib", "loin", "rump", "round", "brisket", "plate", "flank", "shank"],
  LAMB: ["neck", "shoulder", "rack", "loin", "leg", "breast", "shank"],
  CHICKEN: ["breast", "wing", "thigh", "drumstick", "back"],
  TURKEY: ["breast", "wing", "thigh", "drumstick", "back"],
} as const satisfies Record<CutAnimal, readonly string[]>;

export type RegionOf<A extends CutAnimal> = (typeof REGIONS)[A][number];

export interface CutPlacement {
  animal: CutAnimal;
  /** One or more regions: a leg quarter spans thigh and drumstick, a whole bird spans every region. */
  regions: string[];
}

const beef = (...regions: RegionOf<"BEEF">[]): CutPlacement => ({ animal: "BEEF", regions });
const lamb = (...regions: RegionOf<"LAMB">[]): CutPlacement => ({ animal: "LAMB", regions });
const chicken = (...regions: RegionOf<"CHICKEN">[]): CutPlacement => ({ animal: "CHICKEN", regions });
const turkey = (...regions: RegionOf<"TURKEY">[]): CutPlacement => ({ animal: "TURKEY", regions });

/** Products that come from one identifiable place. Mixes, offal without a visible region and bundles are absent. */
export const cutPlacements: Record<string, CutPlacement> = {
  entrecote: beef("rib"),
  "aged-entrecote-28": beef("rib"),
  "aged-tomahawk-35": beef("rib"),
  "entrecote-skewers": beef("rib"),
  "beef-fillet": beef("loin"),
  shayetel: beef("rump"),
  asado: beef("plate"),
  denver: beef("chuck"),
  "aged-denver-21": beef("chuck"),
  "mock-fillet": beef("chuck"),
  "beef-shoulder": beef("chuck"),
  brisket: beef("brisket"),
  "osso-buco": beef("shank"),
  flank: beef("flank"),
  "beef-cheeks": beef("head"),
  "beef-tongue": beef("head"),

  "lamb-rack": lamb("rack"),
  "lamb-shoulder": lamb("shoulder"),
  "lamb-neck": lamb("neck"),

  "whole-chicken": chicken("breast", "wing", "thigh", "drumstick", "back"),
  "chicken-breast": chicken("breast"),
  "chicken-schnitzel": chicken("breast"),
  pargiyot: chicken("thigh"),
  "pargiyot-skewers": chicken("thigh"),
  "chicken-drumsticks": chicken("drumstick"),
  "chicken-leg-quarters": chicken("thigh", "drumstick"),
  "chicken-wings": chicken("wing"),
  "bbq-wings": chicken("wing"),
  "soup-bones-chicken": chicken("back"),

  "turkey-breast": turkey("breast"),
  "turkey-shawarma": turkey("thigh"),
  "turkey-shank": turkey("drumstick"),
  "turkey-wings": turkey("wing"),
};

export const placementOf = (slug: string): CutPlacement | undefined => cutPlacements[slug];

/** Every placed product in a region, for the cut guide ("from the rib: entrecôte, tomahawk …"). */
export function slugsInRegion(animal: CutAnimal, region: string): string[] {
  return Object.entries(cutPlacements)
    .filter(([, p]) => p.animal === animal && p.regions.includes(region) && p.regions.length === 1)
    .map(([slug]) => slug);
}
