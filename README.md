# קצביית הרימון · Harimon Butchery

A Hebrew-first online kosher butcher: customer storefront and staff back-office in one Next.js app.

> **This is a demo / portfolio project.** The shop, its products, prices, customers and orders are
> fictional. **The kashrut authorities shown are invented** and do not represent any real
> certification body. Payments and WhatsApp/SMS messages run in demo mode by default: no card is
> charged and no message is sent, and the interface says so wherever it matters.

## What makes it different

- **Honest weight pricing.** Meat is ordered by weight, the card is held for the estimate plus a
  stated tolerance, and only the real packed weight is charged.
- **Kashrut on the product card** — authority, glatt, nikur, salting, Passover status, certificate validity.
- **Knows the Jewish calendar** — no Shabbat or holiday delivery, Friday cutoffs from real candle-lighting times.
- **A real butcher's weighing screen** built for a tablet in a cold room.

## Running it locally

Requirements: Node 24, Homebrew PostgreSQL 17.

```bash
brew install postgresql@17 && brew services start postgresql@17
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000 (Hebrew) or http://localhost:3000/en (English).

## Docs

- `docs/PLAN.md` — the approved product and architecture plan
- `docs/adr/` — architecture decisions with evidence
- `CONSTRAINTS.md` — the quality bar
- `CLAUDE.md` — coding conventions
