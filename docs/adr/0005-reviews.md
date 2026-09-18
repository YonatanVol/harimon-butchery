# ADR 0005 — Reviews are attached to an order line, not to a product

**Date:** 2026-09-18 · **Status:** accepted

## The decision

A review belongs to one cut *on one order*. `product_review` carries `order_id` alongside `product_id`,
with a unique index on the pair, and a review can only be written for a line that actually reached the
customer: the order is `DELIVERED` or `CLOSED`, and the line's status is not `SHORT`, `CANCELLED` or
`SUBSTITUTED`.

## Why

Every meat site says "verified purchase". Most mean "this account has an account". Attaching the review to
the order line makes the claim a fact of the schema rather than a badge the code hands out:

- The shop cannot show a review from someone who never bought the cut, because there is no row to write.
- It cannot show one for a cut that was sold out and marked short, or swapped for another cut at the
  counter — both happen often in a butcher's shop, and both were holes in the first version of this
  feature until an independent review found them.
- One review per cut per order is a natural, enforceable limit: someone who buys entrecôte every week can
  say something new each time, and nobody can write ten reviews of one delivery.

The alternative — a review keyed on (customer, product) — needs an extra "did they ever buy it" query that
is easy to get wrong, cannot tell a second purchase from a second opinion, and has no answer for a cut
that was ordered but never delivered.

## Consequences

- Both the invitation query and the write path must share the same "this line arrived" predicate.
  They do: `lineArrived()` in `src/infra/reviews/repository.ts`. Adding a new line status means revisiting it.
- A rejected review still occupies the (order, product) pair, so that line cannot be reviewed again. This
  is deliberate — it stops a rejected review being resubmitted unchanged — and the customer is told they
  have already reviewed this cut on this order.
- Reviews are moderated before they appear (`status = PENDING` by default). The shop does not remove a
  review for being critical; the moderation note is internal and never shown on the storefront.
- Ratings are whole stars and averages are integer tenths, so no rating arithmetic ever needs a float.
- Body length is checked in characters (`[...text].length`) on both sides, because the database's
  `char_length` counts an emoji as one and JavaScript's `.length` counts it as two.
