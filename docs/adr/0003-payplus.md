# 0003 — PayPlus as the real card processor

**Status:** implemented against documentation; **not yet run against a live sandbox account.**

## Decision

PayPlus (REST API v1.0) implements the same `PaymentProvider` contract as the demo gateway
(`src/infra/payments/payplus.ts`). `PAYMENT_PROVIDER=PAYPLUS` plus five `PAYPLUS_*` values turns it on;
if any is missing the app refuses to start a payment — money never silently falls back to the demo.

## What the implementation relies on, and how sure we are

Sources: docs.payplus.co.il (endpoint reference pages) and PayPlus's own WooCommerce plugin
(`PayPlus-Gateway/payplus-payment-gateway`, commit 83f68b36).

| Behaviour | Source | Confidence |
|---|---|---|
| Sandbox `restapidev.payplus.co.il/api/v1.0/`, production `restapi.payplus.co.il/api/v1.0/` | docs | Confirmed |
| `PaymentPages/generateLink`, `charge_method` 2 = J5 hold, 1 = J4 charge, `create_token` | docs | Confirmed |
| Amounts are decimal shekels (converted exactly in `domain/money/wire.ts`) | docs + plugin | Confirmed |
| `Transactions/ChargeByTransactionUID`: capture ≤ the J5 amount, partial allowed | docs | Confirmed |
| `Transactions/RefundByTransactionUID`: partial refunds | docs + plugin | Confirmed |
| Callback header `hash` = base64 HMAC-SHA256 of the body with the secret key, `user-agent: PayPlus` | docs + plugin | Confirmed (we hash the raw body, as the plugin does) |
| Auth: docs show `api-key`/`secret-key` headers, plugins send an `Authorization` JSON header | both | **We send both**; which one sandbox accepts is unconfirmed |
| `PaymentPages/ipn` answers with a flat `data` (`status_code`, `transaction_uid`, `amount`, `four_digits`, `brand_name`, `token_uid`) | plugin code only | **Unconfirmed** |
| `customer_uid` in that response (needed to charge a token) | nowhere | **Unconfirmed** — without it, approved extras can't be charged and the order trims instead |
| `Transactions/Cancel` releases a J5 hold on the cardholder's card | nowhere; docs say same-day only | **Unconfirmed** |
| Whether a second partial capture on one J5 is allowed | nowhere | Unconfirmed — we never ask for one |
| How long a J5 hold stays valid | nowhere | Unconfirmed — the app treats holds as valid 5 days (`HOLD_VALID_DAYS`) |
| Which card-network codes mean what | SHVA conventions | Only 001/002/043 (blocked), 036 (expired) are mapped; the rest are generic declines with the raw code kept |

## Design choices

- **The browser return and the callback are only nudges.** Both look the payment up with PayPlus
  server-side before any state changes (`resolveAuthorization`).
- **A capture is marked per hold, not per attempt** (`more_info = capture:<J5 uid>`). Before capturing,
  `Transactions/View` is asked whether that marker already succeeded, so a retry after a timeout returns
  the first capture instead of charging again. Refunds and token charges use the app's idempotency keys
  the same way.
- **Refunds go to the capture's transaction**, not the J5 hold: PayPlus creates a new transaction when a
  hold is captured. `refundOrder` uses `payment_capture.provider_capture_ref`; the demo gateway returns the
  same reference so both providers behave alike.
- **Token references are opaque to the app**: PayPlus needs the token and its customer UID together, so the
  provider stores `token|customer_uid`.
- **Network failures are results, not exceptions**, for capture, refund, cancel and token charges; a lookup
  that can't reach PayPlus is `PENDING`, never paid.

## How it is verified

- `tests/unit/payplus.test.ts` pins every request we send and how replies are read (fake network).
- `tests/contract/payment-provider.contract.ts` runs against the demo gateway always, and against the
  PayPlus sandbox when keys are present. Without keys it prints "NOT RUN" and skips. Tests that need a paid
  page are skipped there too, because paying means typing PayPlus's test card on their page.
- `npm run payplus:check` is the end-to-end check: it creates a ₪465 hold page, a person pays it with the
  sandbox test card, and the script captures ₪387, retries the capture, refunds ₪50 and charges ₪1 on the
  token, printing each result to compare with the PayPlus dashboard.

## Money flows and locking (after the independent review)

Cancellations, approved extras and refunds hold the order row lock from the state check through the provider
call to the record. That closed real double-charge and lost-record races (see
`tests/integration/review-money.test.ts`). The cost, accepted for now:

- **Lock and connection held during a provider call.** With PayPlus a call can take up to its 20-second timeout
  (twice when an idempotency check runs first), during which the tablet can't change that order. With the demo
  gateway each call uses a second pool connection, so about ten money actions at the same instant in one
  process could wait on each other (pool: `DB_POOL_MAX`, default 10 — kept small because builds and serverless
  instances share Postgres's connection limit).
- **If the server dies after money moved but before the record commits**, the record is rolled back. Every call
  has a stable key, so repeating the action finds the earlier result instead of moving money again — but someone
  has to repeat it. A durable "payment in flight" record written before the provider call would remove that gap.
- **Abandoned checkouts** are expired when staff open the board and when customers open the cart or checkout; there
  is no scheduled job (Vercel's hobby plan allows daily crons only).
