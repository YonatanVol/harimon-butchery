# ADR 0002 — Money in agorot, weight in grams, holds that can't be exceeded

**Status:** accepted · 2026-09-13

## In plain words

Prices are stored as whole agorot and weights as whole grams, so there are no decimals to round
wrongly. A weight order holds the price of every line at its *maximum allowed* weight, rounded up
to the shekel; after weighing we charge the real price, which by construction can't be higher.

## Decisions

- `Agorot` and `Grams` are branded integer types (`src/domain/money/agorot.ts`,
  `src/domain/weight/grams.ts`). A bare `number` does not type-check where money is expected.
- One rounding policy, **round half up**, in `divRoundHalfUp`. Weight price:
  `round(agorot_per_kg × grams / 1000)`.
- Tolerance bounds: `max = floor(requested × (1 + t))`, `min = ceil(requested × (1 − t))` — both
  stay inside the stated percentage.
- Hold (`quoteOrder`): `ceilToShekel(Σ price(line at max) + packages + delivery)`. Package-only
  orders hold the exact total.
- VAT is included in displayed prices; extracted as `round(gross × 1800 / 11800)`, `net = gross − vat`.
- Display: whole shekels without decimals (`169 ₪`), otherwise two decimals (`129.90 ₪`).

## Evidence

- `tests/unit/order-totals.test.ts` — property test, 10,000 random orders with random actual
  weights inside tolerance (and some lines not supplied): final charge ≤ hold, always.
  **Mutation check:** replacing the max-weight ceiling with the requested weight makes the
  property fail after 396 cases, so the test is not vacuous.
- VAT split verified exact for every amount from 1 to 200,000 agorot.
- `/he/dev/kitchen-sink` recomputes the reference vectors live on screen.
