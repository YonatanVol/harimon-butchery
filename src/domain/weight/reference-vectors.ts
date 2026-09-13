/**
 * Hand-computed weight × price examples. The unit tests assert every row, and the kitchen-sink
 * page recomputes them live, so a regression is visible on screen as well as in CI.
 */
export const PRICE_FOR_WEIGHT_VECTORS: ReadonlyArray<{
  grams: number;
  pricePerKgAgorot: number;
  expectedAgorot: number;
}> = [
  { grams: 2500, pricePerKgAgorot: 12900, expectedAgorot: 32250 },
  { grams: 2500, pricePerKgAgorot: 16900, expectedAgorot: 42250 },
  { grams: 2750, pricePerKgAgorot: 16900, expectedAgorot: 46475 },
  { grams: 2387, pricePerKgAgorot: 16900, expectedAgorot: 40340 },
  { grams: 1333, pricePerKgAgorot: 4500, expectedAgorot: 5999 },
  { grams: 850, pricePerKgAgorot: 28900, expectedAgorot: 24565 },
  { grams: 1, pricePerKgAgorot: 2700, expectedAgorot: 3 },
];
