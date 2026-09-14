# קצביית הרימון · Harimon Butchery

A Hebrew-first online kosher butcher: customer storefront and staff back-office in one Next.js app.

> **This is a demo / portfolio project.** The shop, its products, prices, customers and orders are
> fictional. **The kashrut authorities shown are invented** and do not represent any real
> certification body. Payments and WhatsApp/SMS messages run in demo mode by default: no card is
> charged and no message is sent, and the interface says so wherever it matters.

## What makes it different

- **Honest weight pricing.** Meat is ordered by weight, the card is held for the estimate plus a
  stated tolerance, and only the real packed weight is charged — never more than was held. Over the
  range, the butcher trims, asks the customer (a separate, disclosed charge), or a manager gives it free.
- **Kashrut on the product card** — authority, glatt, nikur, salting, Passover status, certificate validity.
- **Knows the Jewish calendar** — no Shabbat or holiday delivery, early close before candle lighting.
- **A real butcher's weighing screen** built for a tablet in a cold room: grams-only keypad, tolerance bar,
  live repricing, undo, substitutions, handling checks (liver broiling), charge on finish.
- **The whole shop, not just a storefront** — delivery run for drivers, refunds and manager decisions with
  written reasons, stock, delivery zones and windows, catalog and prices, an activity log, printouts
  (pick sheet, package label, delivery note), phone sign-in and order history, back-in-stock and new-city lists.

## Running it locally

Requirements: Node 24, Homebrew PostgreSQL 17.

```bash
brew install postgresql@17 && brew services start postgresql@17
npm install
cp .env.example .env.local   # then set SESSION_SECRET (the file shows how)
npm run db:setup && npm run db:migrate && npm run db:migrate:test
npm run db:seed              # demo catalog + 20 orders in every state
npm run dev
```

Open http://localhost:3000 (Hebrew) or http://localhost:3000/en (English).
Staff area: http://localhost:3000/he/staff/login — every demo staff member's PIN is `1234`.

## Tests

| Command | What it covers |
|---|---|
| `npm test` | Unit: money and weight arithmetic (property tests), VAT, order state machine, delivery calendar for a full Hebrew year, permissions, OTP rules, Code 128, architecture and message-key checks |
| `npm run test:integration` | Real Postgres: checkout races, weighing and capture, customer approvals, refunds, deliveries, stock, zones, catalog, sign-in, notifications, and the payment contract against the demo gateway |
| `npm run test:e2e` | Playwright on a production build with its own database: RTL gate on every screen (Hebrew desktop and phone, English), checkout and decline, waiting list, tablet weighing with a customer approval, delivery and refund, phone sign-in |
| `npm run payplus:check` | Manual end-to-end run against the real PayPlus sandbox (needs keys; a person pays the test page) |

## Real providers

- **PayPlus** (card holds, capture, refunds, token charges): set `PAYMENT_PROVIDER=PAYPLUS` and the
  `PAYPLUS_*` values in `.env.local`. Implemented from PayPlus's documentation and plugins but **not yet run
  against a live sandbox account** — see `docs/adr/0003-payplus.md` for what is confirmed and what isn't.
- **WhatsApp Cloud API / InforU SMS**: set `NOTIFICATIONS_PROVIDER` and credentials. Built from the providers'
  public references, **not verified against live accounts** (both require a registered business).

## Known limitations

- Product photos are licensed stock (Unsplash, Pexels, Pixabay, one public-domain Wikimedia image), chosen by hand;
  sources and licences are in `public/catalog/CREDITS.json`. Some are near matches rather than the exact cut (for
  example the dry-aged steaks; the beef tongue is shown cooked and sliced), and 5 products still show the designed
  placeholder tile because no licensed photo matched without looking like pork or breaking kashrut: chicken backs,
  turkey wings, lamb neck, merguez and the Passover bundle.
- Code 128 barcodes are structurally tested but not yet checked with a physical scanner.
- A 404 page's first HTML (before JavaScript) is Next.js's bare error shell; the localized page renders on load.
- Cold-chain and handling rules are sensible defaults and deserve a domain expert's review before real use.
- Staff sign in on a shared kiosk screen that lists staff names; five wrong PINs lock that member for five
  minutes, which someone could repeat to keep a member locked out. A real deployment should put the staff area
  behind the shop's network or single sign-on.
- A line the customer paid extra for can't be corrected on the weighing screen; the manager's only option is to
  cancel the order (which refunds everything).
- Money actions hold a lock while the payment provider answers; see `docs/adr/0003-payplus.md` for the trade-offs.

## Docs

- `docs/PLAN.md` — the approved product and architecture plan
- `docs/adr/` — architecture decisions with evidence (0004: why production uses node-postgres on Supabase's
  transaction pooler, port 6543)
- `CONSTRAINTS.md` — the quality bar
- `CLAUDE.md` — coding conventions
